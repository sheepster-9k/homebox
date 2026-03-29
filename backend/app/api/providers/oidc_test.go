package providers

import (
	"testing"

	"github.com/sysadminsmedia/homebox/backend/internal/sys/config"
)

func TestGetOAuth2ConfigUsesConfiguredRedirectURL(t *testing.T) {
	provider := &OIDCProvider{
		config: &config.OIDCConf{
			ClientID:     "client-id",
			ClientSecret: "client-secret",
			Scope:        "openid profile email",
			RedirectURL:  "https://hb.neon-sheep.net/api/v1/users/login/oidc/callback",
		},
	}

	oauthConfig := provider.getOAuth2Config("http://internal-homebox:7745")

	if oauthConfig.RedirectURL != provider.config.RedirectURL {
		t.Fatalf("expected configured redirect URL %q, got %q", provider.config.RedirectURL, oauthConfig.RedirectURL)
	}
}

func TestGetOAuth2ConfigBuildsRedirectURLFromBaseURL(t *testing.T) {
	provider := &OIDCProvider{
		config: &config.OIDCConf{
			ClientID:     "client-id",
			ClientSecret: "client-secret",
			Scope:        "openid profile email",
		},
	}

	oauthConfig := provider.getOAuth2Config("https://hb.neon-sheep.net")

	want := "https://hb.neon-sheep.net/api/v1/users/login/oidc/callback"
	if oauthConfig.RedirectURL != want {
		t.Fatalf("expected fallback redirect URL %q, got %q", want, oauthConfig.RedirectURL)
	}
}
