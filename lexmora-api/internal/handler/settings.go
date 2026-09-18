package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ArminDashti/lexmora-api/internal/domain"
	"github.com/ArminDashti/lexmora-api/internal/repository"
)

type patchSettingsRequest struct {
	OpenRouterAPIKey *string `json:"openrouter_api_key"`
	GeminiAPIKey     *string `json:"gemini_api_key"`
	APIProvider      *string `json:"api_provider"`
	ModelName        *string `json:"model_name"`
}

func (h *Handler) GetSettings(c *gin.Context) {
	settings, err := h.settingsService.Get(c.Request.Context())
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (h *Handler) PatchSettings(c *gin.Context) {
	var req patchSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.APIError{Error: err.Error(), Code: "VALIDATION_ERROR"})
		return
	}

	settings, err := h.settingsService.Update(c.Request.Context(), repository.SettingsUpdate{
		OpenRouterAPIKey: req.OpenRouterAPIKey,
		GeminiAPIKey:     req.GeminiAPIKey,
		APIProvider:      req.APIProvider,
		ModelName:        req.ModelName,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (h *Handler) ClearData(c *gin.Context) {
	if err := h.settingsService.ClearAllData(c.Request.Context()); err != nil {
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) SearchModels(c *gin.Context) {
	settings, err := h.settingsService.Get(c.Request.Context())
	if err != nil {
		h.handleError(c, err)
		return
	}
	if strings.TrimSpace(settings.OpenRouterAPIKey) == "" {
		c.JSON(http.StatusBadRequest, domain.APIError{
			Error: "openrouter API key is not configured",
			Code:  "VALIDATION_ERROR",
		})
		return
	}

	models, err := h.openRouter.ListModels(c.Request.Context(), settings.OpenRouterAPIKey, c.Query("q"), 50)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, models)
}

func (h *Handler) GetCredits(c *gin.Context) {
	settings, err := h.settingsService.Get(c.Request.Context())
	if err != nil {
		h.handleError(c, err)
		return
	}
	if strings.TrimSpace(settings.OpenRouterAPIKey) == "" {
		c.JSON(http.StatusBadRequest, domain.APIError{
			Error: "openrouter API key is not configured",
			Code:  "VALIDATION_ERROR",
		})
		return
	}

	credits, err := h.openRouter.GetCredits(c.Request.Context(), settings.OpenRouterAPIKey)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, credits)
}
