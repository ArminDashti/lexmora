package service

import (
	"context"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/ArminDashti/lexmora-api/internal/domain"
	"github.com/ArminDashti/lexmora-api/internal/repository"
	"github.com/google/uuid"
)

const (
	quizMinCount     = 1
	quizMaxCount     = 50
	quizPoolFetchMax = 500
)

type QuizService struct {
	history *repository.HistoryRepository
	rng     *rand.Rand
}

func NewQuizService(history *repository.HistoryRepository) *QuizService {
	return &QuizService{
		history: history,
		rng:     rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

type QuizRequest struct {
	Types []string `json:"types"`
	Count int      `json:"count"`
}

type QuizQuestion struct {
	HistoryID   string `json:"history_id"`
	Type        string `json:"type"`
	TypeDisplay string `json:"type_display"`
	Prompt      string `json:"prompt"`
	Answer      string `json:"answer"`
}

type QuizResponse struct {
	Questions []QuizQuestion `json:"questions"`
}

func (s *QuizService) Create(ctx context.Context, req QuizRequest) (*QuizResponse, error) {
	count := req.Count
	if count < quizMinCount || count > quizMaxCount {
		return nil, fmt.Errorf("invalid count: must be between %d and %d", quizMinCount, quizMaxCount)
	}

	poolLimit := quizPoolFetchMax
	if count*10 > poolLimit {
		poolLimit = count * 10
		if poolLimit > 500 {
			poolLimit = 500
		}
	}

	pool, err := s.history.ListForQuiz(ctx, poolLimit)
	if err != nil {
		return nil, err
	}
	if len(pool) == 0 {
		return nil, fmt.Errorf("no English-Persian history entries available for quiz")
	}

	questions := make([]QuizQuestion, 0, count)
	selectedIDs := make([]uuid.UUID, 0, count)
	usedInQuiz := map[uuid.UUID]struct{}{}

	// Working copy of show counts so repeats within this quiz stay fair.
	shown := make(map[uuid.UUID]int, len(pool))
	for _, row := range pool {
		shown[row.ID] = row.QuizShownCount
	}

	for len(questions) < count {
		row, ok := s.pickNext(pool, shown, usedInQuiz)
		if !ok {
			return nil, fmt.Errorf("no English-Persian history entries available for quiz")
		}
		prompt, answer := quizPromptAnswer(row)
		if prompt == "" || answer == "" {
			continue
		}
		questions = append(questions, QuizQuestion{
			HistoryID:   row.ID.String(),
			Type:        string(row.Type),
			TypeDisplay: row.TypeDisplay,
			Prompt:      prompt,
			Answer:      answer,
		})
		selectedIDs = append(selectedIDs, row.ID)
		usedInQuiz[row.ID] = struct{}{}
		shown[row.ID] = shown[row.ID] + 1
	}

	if err := s.history.BumpQuizShown(ctx, selectedIDs); err != nil {
		return nil, err
	}

	return &QuizResponse{Questions: questions}, nil
}

// pickNext prefers unused IDs in this quiz among the lowest show-count rows.
func (s *QuizService) pickNext(
	pool []domain.HistoryRecord,
	shown map[uuid.UUID]int,
	usedInQuiz map[uuid.UUID]struct{},
) (domain.HistoryRecord, bool) {
	if len(pool) == 0 {
		return domain.HistoryRecord{}, false
	}

	minAll := -1
	minUnused := -1
	for _, row := range pool {
		c := shown[row.ID]
		if minAll < 0 || c < minAll {
			minAll = c
		}
		if _, used := usedInQuiz[row.ID]; !used {
			if minUnused < 0 || c < minUnused {
				minUnused = c
			}
		}
	}

	target := minAll
	preferUnused := minUnused >= 0
	if preferUnused {
		target = minUnused
	}

	candidates := make([]domain.HistoryRecord, 0)
	for _, row := range pool {
		if shown[row.ID] != target {
			continue
		}
		if preferUnused {
			if _, used := usedInQuiz[row.ID]; used {
				continue
			}
		}
		candidates = append(candidates, row)
	}
	if len(candidates) == 0 {
		return domain.HistoryRecord{}, false
	}

	return candidates[s.rng.Intn(len(candidates))], true
}

// quizPromptAnswer always presents English as the prompt and Persian as the answer.
func quizPromptAnswer(row domain.HistoryRecord) (prompt, answer string) {
	input := strings.TrimSpace(row.InputText)
	result := strings.TrimSpace(row.ResultText)
	switch row.Type {
	case domain.HistoryTypeEnFa:
		return input, result
	case domain.HistoryTypeFaEn:
		return result, input
	default:
		return "", ""
	}
}
