#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

pub mod instructions;
pub mod state;

use instructions::*;
use state::*;

#[program]
pub mod voting_dapp {
    use super::*;

 pub fn initialize_poll(ctx:Context<InitializePoll>,poll_id:u64,description: String,poll_start: u64,poll_end: u64) -> Result<()>{
let poll = &mut ctx.accounts.poll;
poll.poll_id = poll_id;
poll.description = description;
poll.poll_start= poll_start;
poll.poll_end = poll_end;
poll.candidate_amount = 0;

    Ok(())
 }
}

