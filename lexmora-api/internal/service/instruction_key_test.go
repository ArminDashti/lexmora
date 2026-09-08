package service

import "testing"

func TestBuildInstructionKeyNaming(t *testing.T) {
	cases := []struct {
		req  CreateInstructionRequest
		want string
	}{
		{CreateInstructionRequest{Operation: "translate", Direction: "en-fa", Mode: "general"}, "translate-english-persian-general"},
		{CreateInstructionRequest{Operation: "translate", Direction: "persian-english", Mode: "scientific", Topic: "aerospace"}, "translate-persian-english-scientific-aerospace"},
		{CreateInstructionRequest{Operation: "simplify"}, "simplify-english-english"},
		{CreateInstructionRequest{Operation: "refine", Style: "formal"}, "refine-english-english-formal"},
		{CreateInstructionRequest{Operation: "cursor", Direction: "fa-en", Mode: "skill"}, "cursor-persian-english-skill"},
		{CreateInstructionRequest{Operation: "frontend", Direction: "english-english", Mode: "for-agent"}, "frontend-english-english-for-agent"},
		{CreateInstructionRequest{Operation: "compare", Language: "fa"}, "compare-persian-persian"},
		{CreateInstructionRequest{Operation: "grammar", Language: "en"}, "grammar-english-english"},
	}
	for _, tc := range cases {
		got, err := buildInstructionKey(tc.req)
		if err != nil {
			t.Fatalf("%+v: %v", tc.req, err)
		}
		if got != tc.want {
			t.Fatalf("got %q want %q", got, tc.want)
		}
	}
}

func TestNormalizeDirectionAliases(t *testing.T) {
	if normalizeDirection("en-fa") != "english-persian" {
		t.Fatal("en-fa alias")
	}
	if normalizeDirection("fa-en") != "persian-english" {
		t.Fatal("fa-en alias")
	}
}
