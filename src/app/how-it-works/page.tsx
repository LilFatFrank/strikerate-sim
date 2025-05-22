"use client";

import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen py-6 md:py-8 px-4 md:px-6">
      <div className="container mx-auto">
        <div className="flex items-center gap-4 mb-8 md:mb-12">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#0d0019]/70 hover:text-[#0d0019] transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span className="text-sm md:text-base">Back</span>
          </Link>
        </div>

        <div className="space-y-12 md:space-y-16">
          {/* Getting Started Section */}
          <section className="space-y-6 md:space-y-8">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-[#0d0019]">
              Getting Started
            </h2>
            <div className="grid gap-6 md:gap-8">
              <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#4f4395] text-white flex items-center justify-center font-bold text-sm md:text-base">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium text-[#0d0019] mb-2 md:mb-3 text-base md:text-lg">
                      Connect Your Wallet
                    </h3>
                    <p className="text-[#0d0019]/70 text-sm md:text-base leading-relaxed">
                      Click the Connect button and sign in with your Solana
                      wallet. Make sure you have some USDC in your wallet to make
                      predictions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#4f4395] text-white flex items-center justify-center font-bold text-sm md:text-base">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium text-[#0d0019] mb-2 md:mb-3 text-base md:text-lg">
                      Choose a Match
                    </h3>
                    <p className="text-[#0d0019]/70 text-sm md:text-base leading-relaxed">
                      Browse upcoming cricket matches and select one to make your
                      prediction. Each match has a pool of USDC that winners will
                      share.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#4f4395] text-white flex items-center justify-center font-bold text-sm md:text-base">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium text-[#0d0019] mb-2 md:mb-3 text-base md:text-lg">
                      Make Your Prediction
                    </h3>
                    <p className="text-[#0d0019]/70 text-sm md:text-base leading-relaxed">
                      Predict the final score for both teams - you'll need to
                      guess both the runs and wickets for each team. Buy in with 2
                      USDC for your prediction.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Scoring System Section */}
          <section className="space-y-6 md:space-y-8">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-[#0d0019]">
              How Scoring Works
            </h2>
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-8 md:space-y-10">
              <p className="text-[#0d0019]/70 text-sm md:text-base leading-relaxed">
                Our scoring system is designed to reward accurate predictions
                while being fair to all participants. Here's how it works:
              </p>

              <div className="space-y-4 md:space-y-6">
                <h3 className="font-medium text-[#0d0019] text-base md:text-lg">
                  For Each Team's Innings:
                </h3>
                <ul className="space-y-3 md:space-y-4 text-[#0d0019]/70 text-sm md:text-base leading-relaxed">
                  <li>
                    You can score up to 50 points for each team's innings (100
                    points total for the match)
                  </li>
                  <li>
                    Runs prediction is worth up to 40 points (80% of the innings
                    score)
                  </li>
                  <li>
                    Wickets prediction is worth up to 10 points (20% of the
                    innings score)
                  </li>
                </ul>
              </div>

              <div className="space-y-4 md:space-y-6">
                <h3 className="font-medium text-[#0d0019] text-base md:text-lg">
                  Runs Scoring:
                </h3>
                <ul className="space-y-3 md:space-y-4 text-[#0d0019]/70 text-sm md:text-base leading-relaxed">
                  <li>
                    The closer your predicted runs are to the actual runs, the
                    more points you get
                  </li>
                  <li>
                    If you predict exactly right, you get the full 40 points
                  </li>
                  <li>
                    The points decrease as your prediction gets further from the
                    actual score
                  </li>
                  <li>
                    Predictions are scored relative to the actual runs scored, ensuring fair scoring regardless of the match's total score
                  </li>
                </ul>
              </div>

              <div className="space-y-4 md:space-y-6">
                <h3 className="font-medium text-[#0d0019] text-base md:text-lg">
                  Wickets Scoring:
                </h3>
                <ul className="space-y-3 md:space-y-4 text-[#0d0019]/70 text-sm md:text-base leading-relaxed">
                  <li>
                    You get 10 points for predicting the exact number of wickets
                  </li>
                  <li>For each wicket you're off by, you lose 2 points</li>
                  <li>
                    This means being off by 5 or more wickets gives you 0 points
                    for wickets
                  </li>
                </ul>
              </div>

              <div className="space-y-4 md:space-y-6">
                <h3 className="font-medium text-[#0d0019] text-base md:text-lg">
                  Winning and Prizes:
                </h3>
                <ul className="space-y-3 md:space-y-4 text-[#0d0019]/70 text-sm md:text-base leading-relaxed">
                  <li>The player with the highest total score wins the match</li>
                  <li>
                    In case of a tie, the prize is split equally between the
                    winners
                  </li>
                  <li>
                    Your winnings are automatically calculated and can be claimed
                    after the match ends
                  </li>
                  <li>
                    The more accurate your prediction, the higher your chances of
                    winning!
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Tips Section */}
          <section className="space-y-6 md:space-y-8">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-[#0d0019]">
              Tips for Success
            </h2>
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100">
              <ul className="space-y-3 md:space-y-4 text-[#0d0019]/70 text-sm md:text-base leading-relaxed">
                <li>
                  Focus on getting the runs prediction right - it's worth more
                  points
                </li>
                <li>Consider the teams' recent form and playing conditions</li>
                <li>
                  Look at the match type (T20 or ODI) as it affects typical scores
                </li>
                <li>
                  Check the stadium's history - some grounds favor batting or
                  bowling
                </li>
                <li>
                  Remember that wickets are harder to predict but can be the
                  difference in close matches
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
