use anchor_lang::prelude::*;

use crate::state::Poll;


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



