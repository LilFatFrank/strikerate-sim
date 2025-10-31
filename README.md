# strikerate - win with precision

## This is Proof of Concept

strikerate allows you to score predictions like an exam, not just check if they're right. Rewards based on prediction accuracy and not just "yes/no" bets.

Every cricket fan plays some fun bets with their friends. We grew up predicting scores and wickets, selecting players and predicting what will happen on the next ball. At the moment, there are apps that allow you to play fantasy leagues by building teams or selecting match winners but none that allow us to play our own games.

## About the Project

strikerate is a cricket prediction platform that allows users to:
- Guess the score on upcoming cricket matches
- Use USDC tokens to place predictions
- Win prizes based on prediction accuracy
- Track their prediction history and performance

## How It Works

[See a detailed walkthrough here.](https://strikerate-sim.vercel.app/)

### Match Lifecycle
1. **Upcoming**: Matches are created and open for predictions
   - Users can place predictions with USDC
   - Predictions are hidden from other users
   - Each prediction costs 2 USDC

2. **Locked**: Match is about to start
   - No new predictions allowed
   - All predictions become visible
   - Match details are frozen

3. **Completed**: Match has ended
   - Final scores are recorded
   - Winners are automatically determined
   - Prizes are distributed to winners

### Prediction Algorithm
1. **Score Prediction**
   - Users predict final scores for both teams
   - Predictions include runs and wickets
   - Maximum 3 digits for runs
   - Maximum 2 digits for wickets (0-10)

2. **Scoring System**
   Each innings is scored out of 50 points (100 total for match):

   **Runs Score**
   - Based on percentage error from actual runs
   - Formula: `50 * (1 - |predicted - actual| / actual)`
   - Higher accuracy = higher score

   **Wickets Score**
   - Based on absolute difference from actual wickets
   - Formula: `20 - (2 * |predicted - actual|)`
   - Each wicket off = -2 points

   **Final Score**
   - Sum of both innings scores
   - Normalized to 100 points
   - Higher score = better prediction

3. **Prize Distribution**
   - Winners can claim prizes immediately
   - Prizes are sent in USDC
   - Automatic calculation of winnings and points
   - Secure claiming process with wallet verification

## MVP Design

1. **Simulating cricket APIs through an admin**
   - Admin creates and manages matches
   - Simulates real cricket match data
   - Controls match lifecycle (upcoming → locked → completed)
   - Records final scores manually

2. **Handling winners and claims in an off chain DB**
   - Firebase Firestore for real-time data
   - Stores predictions, scores, and claims
   - Handles user authentication
   - Manages match status and updates

3. **Used the admin wallet to settle payments instead of a smart contract**
   - Admin wallet handles USDC transfers
   - Manual verification of winners
   - Direct payment to user wallets
   - Simplified payment flow for MVP

This approach allows us to:
- Test the core prediction mechanics
- Validate the scoring algorithm
- Gather user feedback
- Iterate quickly on features
- Prepare for smart contract integration

## Tech Stack

- **Framework**: Next.js
- **Blockchain**: Solana, USDC Token
- **Backend**: Firebase (Firestore)
- **Authentication**: Wallet-based with message signing
- **Styling**: Custom design system

## Getting Started

1. Clone the repository:
```bash
git clone git@github.com:LilFatFrank/strikerate-sim.git
cd strikerate-sim
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example
```
Fill in the required environment variables

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
