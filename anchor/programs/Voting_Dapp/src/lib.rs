#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

pub mod instructions;
pub mod state;
pub mod error;

use instructions::*;
use state::*;
pub use error::*;

#[program]
pub mod voting_dapp {
    use super::*;

  // Initialize a new poll.
  pub fn initialize_poll(
    ctx: Context<InitializePoll>, 
    poll_id: u64, 
    description: String, 
    poll_start: u64, 
    poll_end: u64
) -> Result<()> {
    // Validate poll duration.
    require!(poll_start < poll_end, CustomError::InvalidPollDuration);

    let poll = &mut ctx.accounts.poll;
    poll.poll_id = poll_id;
    poll.description = description;
    poll.poll_start = poll_start;
    poll.poll_end = poll_end;
    poll.candidate_amount = 0;
    poll.votes_cast = 0;
    Ok(())
}

pub fn register_candidate (
    ctx: Context<RegisterCandidate>,
    candidate_name: String
) -> Result<()> {
let poll =  &mut ctx.accounts.poll;
let candidate = &mut ctx.accounts.candidate;
candidate.poll = poll.key();
candidate.candidate_name = candidate_name;
candidate.vote_count =0;
poll.candidate_amount = poll.candidate_amount.checked_add(1)
.ok_or(CustomError::Overflow)?;
Ok(())

}

pub fn cast_vote(
    ctx:Context<CastVote>,
    candidate_id: u32
) -> Result<()>{
    let voter = &mut ctx.accounts.voter;
    require!(!voter.has_voted, CustomError::AlreadyVoted);

    voter.poll = ctx.accounts.poll.key();
    voter.voter = ctx.accounts.user.key();
    voter.selected_option = candidate_id;
    voter.has_voted = true;

 let candidate= &mut ctx.accounts.candidate;
 candidate.vote_count = candidate.vote_count.checked_add(1).ok_or(CustomError::Overflow)?;

 let poll =&mut ctx.accounts.poll;
 poll.votes_cast = poll.votes_cast.checked_add(1).ok_or(CustomError::Overflow)?;
 Ok(())


}

}

