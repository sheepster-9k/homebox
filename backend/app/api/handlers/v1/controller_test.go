package v1

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/sysadminsmedia/homebox/backend/app/api/providers"
	"github.com/sysadminsmedia/homebox/backend/internal/core/services"
	"github.com/sysadminsmedia/homebox/backend/internal/sys/config"
)

func TestOIDCEnabledRequiresProvider(t *testing.T) {
	ctrl := &V1Controller{
		svc: &services.AllServices{
			BackgroundService: &services.BackgroundService{},
		},
		config: &config.Config{
			OIDC: config.OIDCConf{
				Enabled:      true,
				ButtonText:   "Sign in with OIDC",
				AutoRedirect: true,
			},
			Options: config.Options{
				AllowLocalLogin: true,
			},
		},
	}

	req := httptest.NewRequest("GET", "/api/v1/status", nil)
	rec := httptest.NewRecorder()

	if err := ctrl.HandleBase(func() bool { return true }, Build{})(rec, req); err != nil {
		t.Fatalf("HandleBase returned error: %v", err)
	}

	var body APISummary
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body.OIDC.Enabled {
		t.Fatalf("expected OIDC enabled=false when provider is unavailable")
	}
	if !body.OIDC.AllowLocal {
		t.Fatalf("expected local login to remain available")
	}
}

func TestOIDCEnabledReportsLiveProvider(t *testing.T) {
	ctrl := &V1Controller{
		svc: &services.AllServices{
			BackgroundService: &services.BackgroundService{},
		},
		config: &config.Config{
			OIDC: config.OIDCConf{
				Enabled:    true,
				ButtonText: "Sign in with OIDC",
			},
		},
		oidcProvider: &providers.OIDCProvider{},
	}

	if !ctrl.OIDCEnabled() {
		t.Fatalf("expected OIDCEnabled to require both config and provider")
	}
}
