package handler

import (
	"net/http"

	"github.com/ArminDashti/lexmora-api/internal/domain"
	"github.com/ArminDashti/lexmora-api/internal/service"
	"github.com/gin-gonic/gin"
)

func (h *Handler) CreateQuiz(c *gin.Context) {
	var req service.QuizRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.APIError{Error: err.Error(), Code: "VALIDATION_ERROR"})
		return
	}

	result, err := h.quizService.Create(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
