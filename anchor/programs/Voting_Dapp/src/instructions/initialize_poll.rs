use anchor_lang::prelude::*;

use crate::state::{Poll,Voter,Candidate};


#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct InitializePoll<'info> {
    #[account(init,
         payer = user, 
        space = 8 + Poll::INIT_SPACE, 
        seeds = [ poll_id.to_le_bytes().as_ref()],  
        bump)]
    pub poll: Account<'info, Poll>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>
}


#[derive(Accounts)]
pub struct RegisterCandidate<'info> {
    #[account(
        mut,
        seeds = [b"poll", &poll.poll_id.to_le_bytes()],
        bump
    )]
    pub poll: Account<'info, Poll>,
  
    #[account(
        init,
        payer= user,
        space = Candidate::INIT_SPACE,
        seeds = [b"candidate", poll.key().as_ref(), &poll.candidate_amount.to_le_bytes()],
        bump
    )]
    pub candidate: Account<'info, Candidate>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,

}
#[derive(Accounts)]
#[instruction(candidate_seed: [u8; 8])]
pub struct CastVote<'info> {
    #[account(
        mut,
        seeds = [b"poll", &poll.poll_id.to_le_bytes()],
        bump
    )]
    pub poll: Account<'info, Poll>,
    #[account(
        init_if_needed,
        payer = user,
        space = Voter::INIT_SPACE,
        seeds = [b"voter", poll.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub voter: Account<'info, Voter>,
    #[account(
        mut,
        seeds = [b"candidate", poll.key().as_ref(), &candidate_seed],
        bump
    )]
    pub candidate: Account<'info, Candidate>,
   
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

