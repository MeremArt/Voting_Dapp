use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Voter {
    pub poll: Pubkey,
    pub voter: Pubkey,
    pub selected_option: u32,
    pub has_voted: bool,
}