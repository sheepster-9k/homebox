package v1

import (
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/hay-kot/httpkit/errchain"
	"github.com/rs/zerolog/log"
)

// HandleCompanionProxy returns a reverse proxy handler that forwards requests
// to the HBC (Homebox Companion) sidecar. The proxy:
//   - Strips the /api/v1/companion prefix
//   - Forwards to HBC's /api/* path
//   - Passes through the request body, method, and content-type as-is
//   - Returns HBC's response directly (including streaming)
//
// Auth is handled by the middleware chain (mwAuthToken, mwTenant, mwRoles)
// before this handler is reached, so any request here is already authenticated.
func (ctrl *V1Controller) HandleCompanionProxy(companionURL string) errchain.HandlerFunc {
	target, err := url.Parse(companionURL)
	if err != nil {
		log.Fatal().Err(err).Str("url", companionURL).Msg("invalid companion URL")
	}

	return func(w http.ResponseWriter, r *http.Request) error {
		// Strip /api/v1/companion prefix, keep the rest as /api/*
		originalPath := r.URL.Path
		stripped := strings.TrimPrefix(originalPath, "/api/v1/companion")
		if stripped == "" || stripped == "/" {
			stripped = ""
		}
		proxyPath := "/api" + stripped

		// Build target URL
		proxyURL := *target
		proxyURL.Path = proxyPath
		proxyURL.RawQuery = r.URL.RawQuery

		// Create proxy request
		proxyReq, err := http.NewRequestWithContext(r.Context(), r.Method, proxyURL.String(), r.Body)
		if err != nil {
			return err
		}

		// Forward all relevant headers (auth, content-type, accept)
		for _, h := range []string{"Content-Type", "Accept", "Authorization"} {
			if v := r.Header.Get(h); v != "" {
				proxyReq.Header.Set(h, v)
			}
		}

		// Forward content length for multipart uploads
		if r.ContentLength > 0 {
			proxyReq.ContentLength = r.ContentLength
		}

		// Execute proxy request
		client := &http.Client{}
		resp, err := client.Do(proxyReq)
		if err != nil {
			log.Warn().Err(err).Str("target", proxyURL.String()).Msg("companion proxy request failed")
			http.Error(w, "companion service unavailable", http.StatusBadGateway)
			return nil
		}
		defer resp.Body.Close()

		// Copy response headers
		for key, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}

		// Write status and body
		w.WriteHeader(resp.StatusCode)
		_, err = io.Copy(w, resp.Body)
		if err != nil {
			log.Warn().Err(err).Msg("error copying companion response body")
		}

		return nil
	}
}
