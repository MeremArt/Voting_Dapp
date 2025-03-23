# Solana Voting dApp

A decentralized voting application built on the Solana blockchain using the Anchor framework.

## Program ID

The program is deployed on Solana Devnet:
```
HQDGJJfXcwNg8MqA3bLd3GFSxJMwPQhhnz9ZDnyTqbY
```

## Overview

This dApp allows users to:
- Create polls with custom descriptions and durations
- Register candidates for each poll
- Cast votes for candidates
- Track votes and view results

The smart contract handles all voting logic including validating that users only vote once per poll and maintaining accurate vote counts.

## Project Structure

```
voting_dapp/
├── programs/
│   └── Voting_Dapp/
│       ├── src/
│       │   ├── instructions/   # Instruction handlers and account validation
│       │   ├── state/          # Account data structures
│       │   ├── error.rs        # Custom error types
│       │   └── lib.rs          # Program entry point and instruction routing
├── app/                        # Front-end application (if applicable)
├── tests/                      # Integration tests
└── Anchor.toml                 # Anchor configuration
```

## Smart Contract Features

- **Poll Creation**: Create polls with a unique ID, description, and start/end times
- **Candidate Registration**: Register candidates for a specific poll
- **Secure Voting**: Each user can only vote once per poll
- **Error Handling**: Custom error types for better error messages

## Account Structure

### Poll
Stores information about a voting poll:
- `poll_id`: Unique identifier for the poll
- `description`: Description of what the poll is about
- `poll_start`: Unix timestamp for when voting starts
- `poll_end`: Unix timestamp for when voting ends
- `candidate_amount`: Number of candidates registered
- `votes_cast`: Total number of votes cast in the poll

### Candidate
Stores information about a candidate:
- `poll`: Reference to the poll this candidate belongs to
- `candidate_name`: Name of the candidate
- `vote_count`: Number of votes received

### Voter
Tracks voting status for each user:
- `poll`: Reference to the poll
- `voter`: Public key of the voter
- `selected_option`: The ID of the candidate selected
- `has_voted`: Flag to prevent multiple votes

## Instructions

### Initialize Poll
Creates a new poll with the specified parameters:
```rust
initialize_poll(poll_id: u64, description: String, poll_start: u64, poll_end: u64)
```

### Register Candidate
Registers a new candidate for a poll:
```rust
register_candidate(candidate_name: String)
```

### Cast Vote
Casts a vote for a specific candidate:
```rust
cast_vote(candidate_id: u32)
```

## Client Integration

To interact with this program from a client application:

1. Install the required dependencies:
```bash
npm install @solana/web3.js @project-serum/anchor
```

2. Connect to the program using the IDL:
```javascript
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import idl from './voting_dapp_idl.json';

const programId = new PublicKey("HQDGJJfXcwNg8MqA3bLd3GFSxJMwPQhhnz9ZDnyTqbY");
const network = "https://api.devnet.solana.com";
const connection = new Connection(network, "confirmed");

// Setup provider
const provider = new AnchorProvider(
  connection, 
  wallet, // Your wallet implementation
  { commitment: "confirmed" }
);

// Create program interface
const program = new Program(idl, programId, provider);
```

3. Call program instructions:
```javascript
// Example: Create a new poll
const createPoll = async () => {
  const pollId = new BN(Date.now());
  
  await program.methods
    .initializePoll(
      pollId,
      "Sample Poll",
      new BN(Math.floor(Date.now() / 1000)),
      new BN(Math.floor(Date.now() / 1000) + 86400) // 24 hours from now
    )
    .accounts({
      poll: /* PDA for poll */,
      user: provider.wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
};
```

## Development

### Prerequisites
- Rust
- Solana CLI
- Anchor Framework

### Build
```bash
anchor build
```

### Test
```bash
anchor test
```

### Deploy
```bash
anchor deploy
```

