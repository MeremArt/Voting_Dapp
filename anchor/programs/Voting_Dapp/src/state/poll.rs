use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Poll {
    pub poll_id:u64,
    #[max_len(280)]
    pub description: String,
    pub poll_start: u64,
    pub poll_end: u64,
    pub candidate_amount: u64
}
