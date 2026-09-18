package service

import (
	"testing"

	"github.com/ArminDashti/lexmora-api/internal/domain"
)

func TestCompleteProviderSelection(t *testing.T) {
	s := &TransformService{}
	settings := &domain.AppSettings{APIProvider: "unknown"}
	_, err := s.complete(nil, settings, "sys", "user")
	if err == nil || err.Error() != "invalid api_provider: unknown" {
		t.Fatalf("expected invalid api_provider error, got %v", err)
	}
}
