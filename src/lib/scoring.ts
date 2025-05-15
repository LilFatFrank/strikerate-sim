interface Innings {
  runs: number;
  wickets: number;
}

interface Prediction {
  team1Score: number;
  team1Wickets: number;
  team2Score: number;
  team2Wickets: number;
}

interface FinalScore {
  team1Score: number;
  team1Wickets: number;
  team2Score: number;
  team2Wickets: number;
}

/**
 * Calculate the normalized score for a single innings
 * @param predicted The predicted score and wickets
 * @param actual The actual score and wickets
 * @returns Normalized score out of 50
 */
function calculateInningsScore(predicted: Innings, actual: Innings): number {
  // Run score (max 50 points)
  const runError = Math.abs(predicted.runs - actual.runs);
  const runScore = Math.max(0, 50 * (1 - runError / actual.runs));

  // Wicket score (max 20 points)
  const wicketError = Math.abs(predicted.wickets - actual.wickets);
  const wicketScore = Math.max(0, 20 - 2 * wicketError);

  // Total raw innings score (max 70) → Normalize to 50
  const inningsRaw = runScore + wicketScore;
  const normalized = (inningsRaw / 70) * 50;

  return Number(normalized.toFixed(3));
}

/**
 * Calculate the total match score for a prediction
 * @param prediction The user's prediction
 * @param finalScore The actual match result
 * @returns Total score out of 100
 */
export function calculateMatchScore(prediction: Prediction, finalScore: FinalScore): number {
  // Calculate home innings score
  const homeScore = calculateInningsScore(
    { runs: prediction.team1Score, wickets: prediction.team1Wickets },
    { runs: finalScore.team1Score, wickets: finalScore.team1Wickets }
  );

  // Calculate away innings score
  const awayScore = calculateInningsScore(
    { runs: prediction.team2Score, wickets: prediction.team2Wickets },
    { runs: finalScore.team2Score, wickets: finalScore.team2Wickets }
  );

  // Total match score (max 100)
  const totalScore = homeScore + awayScore;
  return Number(totalScore.toFixed(3));
}
