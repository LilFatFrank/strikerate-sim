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
  // Protect against division by zero
  const safeActualRuns = actual.runs === 0 ? 1 : actual.runs;

  // Run score (max 40 points - 80% of 50)
  const runError = Math.min(Math.abs(predicted.runs - actual.runs), safeActualRuns);
  const runScore = Math.max(0, 40 * (1 - runError / safeActualRuns));

  // Wicket score (max 10 points - 20% of 50)
  const wicketError = Math.abs(predicted.wickets - actual.wickets);
  const wicketScore = Math.max(0, 10 - 2 * wicketError);

  // Total raw innings score (max 50)
  return Number((runScore + wicketScore).toFixed(3));
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
