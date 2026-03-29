package v1

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/sysadminsmedia/homebox/backend/internal/core/services"
	"github.com/sysadminsmedia/homebox/backend/internal/core/services/reporting/eventbus"
	"github.com/sysadminsmedia/homebox/backend/internal/data/ent"
	"github.com/sysadminsmedia/homebox/backend/internal/data/repo"
	"github.com/sysadminsmedia/homebox/backend/internal/sys/config"
	_ "github.com/sysadminsmedia/homebox/backend/pkgs/cgofreesqlite"
)

func TestHandleTailscaleLoginRejectsNonTailnetHost(t *testing.T) {
	ctrl := &V1Controller{}

	req := httptest.NewRequest(http.MethodPost, "https://hb.neon-sheep.net/api/v1/users/login/tailscale", nil)
	rec := httptest.NewRecorder()

	err := ctrl.HandleTailscaleLogin()(rec, req)
	if err == nil {
		t.Fatalf("expected error for non-tailnet host")
	}
}

func TestHandleTailscaleLoginCreatesSessionFromServeHeaders(t *testing.T) {
	ctrl, repos := newTestAuthController(t)

	req := httptest.NewRequest(http.MethodPost, "https://homebox-1.magellanic-delta.ts.net/api/v1/users/login/tailscale", nil)
	req.Header.Set("Tailscale-User-Login", "alice@example.com")
	req.Header.Set("Tailscale-User-Name", "Alice Example")

	rec := httptest.NewRecorder()
	if err := ctrl.HandleTailscaleLogin()(rec, req); err != nil {
		t.Fatalf("HandleTailscaleLogin returned error: %v", err)
	}

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var body TokenResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !strings.HasPrefix(body.Token, "Bearer ") {
		t.Fatalf("expected bearer token, got %q", body.Token)
	}
	if body.AttachmentToken == "" {
		t.Fatalf("expected attachment token")
	}

	foundUser, err := repos.Users.GetOneEmail(context.Background(), "alice@example.com")
	if err != nil {
		t.Fatalf("expected created user: %v", err)
	}
	if foundUser.OidcIssuer == nil || *foundUser.OidcIssuer != tailscaleIssuer {
		t.Fatalf("expected oidc issuer %q, got %+v", tailscaleIssuer, foundUser.OidcIssuer)
	}
	if foundUser.OidcSubject == nil || *foundUser.OidcSubject != "alice@example.com" {
		t.Fatalf("expected oidc subject to be login, got %+v", foundUser.OidcSubject)
	}
}

func newTestAuthController(t *testing.T) (*V1Controller, *repo.AllRepos) {
	t.Helper()

	client, err := ent.Open("sqlite3", "file:auth-controller?mode=memory&cache=shared&_fk=1&_time_format=sqlite")
	if err != nil {
		t.Fatalf("failed opening sqlite: %v", err)
	}
	t.Cleanup(func() { _ = client.Close() })

	if err := client.Schema.Create(context.Background()); err != nil {
		t.Fatalf("failed creating schema: %v", err)
	}

	tempDir := t.TempDir()
	if err := os.MkdirAll(tempDir+"/homebox", 0o755); err != nil {
		t.Fatalf("failed creating temp storage dir: %v", err)
	}

	repos := repo.New(
		client,
		eventbus.New(),
		config.Storage{
			PrefixPath: "/",
			ConnString: "file://" + tempDir,
		},
		"mem://{{ .Topic }}",
		config.Thumbnail{Enabled: false},
	)

	return &V1Controller{
		svc: services.New(repos),
		config: &config.Config{
			Options: config.Options{
				AllowLocalLogin: true,
				Hostname:        "homebox-1.magellanic-delta.ts.net",
			},
		},
		cookieSecure: true,
		url:          "https://homebox-1.magellanic-delta.ts.net",
	}, repos
}
