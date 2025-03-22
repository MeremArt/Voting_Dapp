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
}

