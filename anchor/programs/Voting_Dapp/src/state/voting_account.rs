use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]

pub struct VotingAccount{
    pub owner: Pubkey,
    pub total_votes: u64
}