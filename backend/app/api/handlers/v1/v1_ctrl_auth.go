package v1

import (
	"errors"
	"fmt"
	"mime"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/hay-kot/httpkit/errchain"
	"github.com/hay-kot/httpkit/server"
	"github.com/rs/zerolog/log"
	"github.com/samber/lo"
	"github.com/sysadminsmedia/homebox/backend/internal/core/services"
	"github.com/sysadminsmedia/homebox/backend/internal/sys/validate"
)

const (
	cookieNameToken    = "hb.auth.token"
	cookieNameRemember = "hb.auth.remember"
	cookieNameSession  = "hb.auth.session"
	tailscaleIssuer    = "tailscale-serve"
	tailnetHostSuffix  = ".ts.net"
)

type (
	TokenResponse struct {
		Token           string    `json:"token"`
		ExpiresAt       time.Time `json:"expiresAt"`
		AttachmentToken string    `json:"attachmentToken"`
	}

	LoginForm struct {
		Username     string `json:"username"     example:"admin@admin.com"`
		Password     string `json:"password"     example:"admin"`
		StayLoggedIn bool   `json:"stayLoggedIn"`
	}
)

type CookieContents struct {
	Token     string
	ExpiresAt time.Time
	Remember  bool
}

func GetCookies(r *http.Request) (*CookieContents, error) {
	cookie, err := r.Cookie(cookieNameToken)
	if err != nil {
		return nil, errors.New("authorization cookie is required")
	}

	rememberCookie, err := r.Cookie(cookieNameRemember)
	if err != nil {
		return nil, errors.New("remember cookie is required")
	}

	return &CookieContents{
		Token:     cookie.Value,
		ExpiresAt: cookie.Expires,
		Remember:  rememberCookie.Value == "true",
	}, nil
}

func (ctrl *V1Controller) TailscaleLoginEnabled(host string) bool {
	return strings.HasSuffix(strings.ToLower(noPort(host)), tailnetHostSuffix)
}

func (ctrl *V1Controller) TailscaleButtonText() string {
	if text := strings.TrimSpace(ctrl.config.Auth.Tailscale.ButtonText); text != "" {
		return text
	}
	return "Sign in with Tailscale"
}

func (ctrl *V1Controller) tailscaleIssuer() string {
	if issuer := strings.TrimSpace(ctrl.config.Auth.Tailscale.Issuer); issuer != "" {
		return issuer
	}
	return tailscaleIssuer
}

func (ctrl *V1Controller) tailscaleHeader(name string, fallback string) string {
	if value := strings.TrimSpace(name); value != "" {
		return value
	}
	return fallback
}

// AuthProvider is an interface that can be implemented by any authentication provider.
// to extend authentication methods for the API.
type AuthProvider interface {
	// Name returns the name of the authentication provider. This should be a unique name.
	// that is URL friendly.
	//
	// Example: "local", "ldap"
	Name() string
	// Authenticate is called when a user attempts to login to the API. The implementation
	// should return an error if the user cannot be authenticated. If an error is returned
	// the API controller will return a vague error message to the user.
	//
	// Authenticate should do the following:
	//
	// 1. Ensure that the user exists within the database (either create, or get)
	// 2. On successful authentication, they must set the user cookies.
	Authenticate(w http.ResponseWriter, r *http.Request) (services.UserAuthTokenDetail, error)
}

// HandleAuthLogin godoc
//
//	@Summary	User Login
//	@Tags		Authentication
//	@Accept		x-www-form-urlencoded
//	@Accept		application/json
//	@Param		payload		body	LoginForm	true	"Login Data"
//	@Param		provider	query	string		false	"auth provider"
//	@Produce	json
//	@Success	200	{object}	TokenResponse
//	@Router		/v1/users/login [POST]
func (ctrl *V1Controller) HandleAuthLogin(ps ...AuthProvider) errchain.HandlerFunc {
	if len(ps) == 0 {
		panic("no auth providers provided")
	}

	providers := lo.SliceToMap(ps, func(p AuthProvider) (string, AuthProvider) {
		log.Info().Str("name", p.Name()).Msg("registering auth provider")
		return p.Name(), p
	})

	return func(w http.ResponseWriter, r *http.Request) error {
		// Extract provider query
		provider := r.URL.Query().Get("provider")
		if provider == "" {
			provider = "local"
		}

		// Block local only when disabled
		if provider == "local" && !ctrl.config.Options.AllowLocalLogin {
			return validate.NewRequestError(fmt.Errorf("local login is not enabled"), http.StatusForbidden)
		}

		// Get the provider
		p, ok := providers[provider]
		if !ok {
			return validate.NewRequestError(errors.New("invalid auth provider"), http.StatusBadRequest)
		}

		newToken, err := p.Authenticate(w, r)
		if err != nil {
			log.Warn().Err(err).Msg("authentication failed")
			return validate.NewUnauthorizedError()
		}

		ctrl.setCookies(w, noPort(r.Host), newToken.Raw, newToken.ExpiresAt, true, newToken.AttachmentToken)
		return server.JSON(w, http.StatusOK, TokenResponse{
			Token:           "Bearer " + newToken.Raw,
			ExpiresAt:       newToken.ExpiresAt,
			AttachmentToken: newToken.AttachmentToken,
		})
	}
}

// HandleTailscaleLogin godoc
//
//	@Summary	Tailscale Tailnet Login
//	@Tags		Authentication
//	@Produce	json
//	@Success	200	{object}	TokenResponse
//	@Router		/v1/users/login/tailscale [POST]
func (ctrl *V1Controller) HandleTailscaleLogin() errchain.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) error {
		host := strings.ToLower(noPort(r.Host))
		if !ctrl.TailscaleLoginEnabled(r.Host) {
			return validate.NewRequestError(
				errors.New("tailscale session bootstrap is only available on tailnet routes"),
				http.StatusForbidden,
			)
		}

		loginHeader := ctrl.tailscaleHeader(ctrl.config.Auth.Tailscale.LoginHeader, "Tailscale-User-Login")
		nameHeader := ctrl.tailscaleHeader(ctrl.config.Auth.Tailscale.NameHeader, "Tailscale-User-Name")

		login := strings.ToLower(strings.TrimSpace(decodeMaybeEncodedHeader(r.Header.Get(loginHeader))))
		if login == "" {
			return validate.NewRequestError(
				errors.New("tailscale identity headers missing"),
				http.StatusUnauthorized,
			)
		}

		displayName := strings.TrimSpace(decodeMaybeEncodedHeader(r.Header.Get(nameHeader)))
		if displayName == "" {
			displayName = login
		}

		newToken, err := ctrl.svc.User.LoginOIDC(r.Context(), ctrl.tailscaleIssuer(), login, login, displayName)
		if err != nil {
			log.Warn().Err(err).Str("login", login).Msg("tailscale session bootstrap failed")
			return validate.NewUnauthorizedError()
		}

		ctrl.setCookies(w, host, newToken.Raw, newToken.ExpiresAt, true, newToken.AttachmentToken)
		return server.JSON(w, http.StatusOK, TokenResponse{
			Token:           "Bearer " + newToken.Raw,
			ExpiresAt:       newToken.ExpiresAt,
			AttachmentToken: newToken.AttachmentToken,
		})
	}
}

// HandleAuthLogout godoc
//
//	@Summary	User Logout
//	@Tags		Authentication
//	@Success	204
//	@Router		/v1/users/logout [POST]
//	@Security	Bearer
func (ctrl *V1Controller) HandleAuthLogout() errchain.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) error {
		token := services.UseTokenCtx(r.Context())
		if token == "" {
			return validate.NewRequestError(errors.New("no token within request context"), http.StatusUnauthorized)
		}

		err := ctrl.svc.User.Logout(r.Context(), token)
		if err != nil {
			return validate.NewRequestError(err, http.StatusInternalServerError)
		}

		ctrl.unsetCookies(w, noPort(r.Host))
		return server.JSON(w, http.StatusNoContent, nil)
	}
}

// HandleAuthRefresh godoc
//
//	@Summary		User Token Refresh
//	@Description	handleAuthRefresh returns a handler that will issue a new token from an existing token.
//	@Description	This does not validate that the user still exists within the database.
//	@Tags			Authentication
//	@Success		200
//	@Router			/v1/users/refresh [GET]
//	@Security		Bearer
func (ctrl *V1Controller) HandleAuthRefresh() errchain.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) error {
		requestToken := services.UseTokenCtx(r.Context())
		if requestToken == "" {
			return validate.NewRequestError(errors.New("no token within request context"), http.StatusUnauthorized)
		}

		newToken, err := ctrl.svc.User.RenewToken(r.Context(), requestToken)
		if err != nil {
			return validate.NewUnauthorizedError()
		}

		ctrl.setCookies(w, noPort(r.Host), newToken.Raw, newToken.ExpiresAt, false, newToken.AttachmentToken)
		return server.JSON(w, http.StatusOK, newToken)
	}
}

func noPort(host string) string {
	return strings.Split(host, ":")[0]
}

func decodeMaybeEncodedHeader(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}

	decoded, err := new(mime.WordDecoder).DecodeHeader(value)
	if err != nil {
		return value
	}

	return strings.TrimSpace(decoded)
}

func (ctrl *V1Controller) setCookies(w http.ResponseWriter, domain, token string, expires time.Time, remember bool, attachmentToken string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieNameRemember,
		Value:    strconv.FormatBool(remember),
		Expires:  expires,
		Domain:   domain,
		Secure:   ctrl.cookieSecure,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	// Set HTTP only cookie
	http.SetCookie(w, &http.Cookie{
		Name:     cookieNameToken,
		Value:    token,
		Expires:  expires,
		Domain:   domain,
		Secure:   ctrl.cookieSecure,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	// Set Fake Session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     cookieNameSession,
		Value:    "true",
		Expires:  expires,
		Domain:   domain,
		Secure:   ctrl.cookieSecure,
		HttpOnly: false,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	// Set attachment token cookie (accessible to frontend, not HttpOnly)
	if attachmentToken != "" {
		http.SetCookie(w, &http.Cookie{
			Name:     "hb.auth.attachment_token",
			Value:    attachmentToken,
			Expires:  expires,
			Domain:   domain,
			Secure:   ctrl.cookieSecure,
			HttpOnly: false,
			Path:     "/",
			SameSite: http.SameSiteLaxMode,
		})
	}
}

func (ctrl *V1Controller) unsetCookies(w http.ResponseWriter, domain string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieNameToken,
		Value:    "",
		Expires:  time.Unix(0, 0),
		Domain:   domain,
		Secure:   ctrl.cookieSecure,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     cookieNameRemember,
		Value:    "false",
		Expires:  time.Unix(0, 0),
		Domain:   domain,
		Secure:   ctrl.cookieSecure,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	// Set Fake Session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     cookieNameSession,
		Value:    "false",
		Expires:  time.Unix(0, 0),
		Domain:   domain,
		Secure:   ctrl.cookieSecure,
		HttpOnly: false,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	// Unset attachment token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "hb.auth.attachment_token",
		Value:    "",
		Expires:  time.Unix(0, 0),
		Domain:   domain,
		Secure:   ctrl.cookieSecure,
		HttpOnly: false,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})
}

// HandleOIDCLogin godoc
//
//	@Summary	OIDC Login Initiation
//	@Tags		Authentication
//	@Produce	json
//	@Success	302
//	@Router		/v1/users/login/oidc [GET]
func (ctrl *V1Controller) HandleOIDCLogin() errchain.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) error {
		if !ctrl.OIDCEnabled() {
			if ctrl.config.OIDC.Enabled && ctrl.oidcProvider == nil {
				log.Error().Msg("OIDC provider not initialized")
				return validate.NewRequestError(errors.New("OIDC provider not available"), http.StatusForbidden)
			}
			return validate.NewRequestError(fmt.Errorf("OIDC is not enabled"), http.StatusForbidden)
		}

		// Initiate OIDC flow
		_, err := ctrl.oidcProvider.InitiateOIDCFlow(w, r)
		return err
	}
}

// HandleOIDCCallback godoc
//
//	@Summary	OIDC Callback Handler
//	@Tags		Authentication
//	@Param		code	query	string	true	"Authorization code"
//	@Param		state	query	string	true	"State parameter"
//	@Success	302
//	@Router		/v1/users/login/oidc/callback [GET]
func (ctrl *V1Controller) HandleOIDCCallback() errchain.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) error {
		if !ctrl.OIDCEnabled() {
			if ctrl.config.OIDC.Enabled && ctrl.oidcProvider == nil {
				log.Error().Msg("OIDC provider not initialized")
				return validate.NewRequestError(errors.New("OIDC provider not available"), http.StatusForbidden)
			}
			return validate.NewRequestError(fmt.Errorf("OIDC is not enabled"), http.StatusForbidden)
		}

		// Handle callback
		newToken, err := ctrl.oidcProvider.HandleCallback(w, r)
		if err != nil {
			log.Err(err).Msg("OIDC callback failed")
			http.Redirect(w, r, "/?oidc_error=oidc_auth_failed", http.StatusFound)
			return nil
		}

		// Set cookies and redirect to home
		ctrl.setCookies(w, noPort(r.Host), newToken.Raw, newToken.ExpiresAt, true, newToken.AttachmentToken)
		http.Redirect(w, r, "/home", http.StatusFound)
		return nil
	}
}
