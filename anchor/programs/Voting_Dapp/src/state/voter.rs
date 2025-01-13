use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Voter {
    pub poll_id: Pubkey,
    pub voter: Pubkey,
    pub selected_option: u32,
    pub has_voted: bool,
}