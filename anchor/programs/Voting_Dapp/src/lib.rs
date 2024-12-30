#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod Voting_Dapp {
    use super::*;

  pub fn close(_ctx: Context<CloseVotingDapp>) -> Result<()> {
    Ok(())
  }

  pub fn decrement(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.Voting_Dapp.count = ctx.accounts.Voting_Dapp.count.checked_sub(1).unwrap();
    Ok(())
  }

  pub fn increment(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.Voting_Dapp.count = ctx.accounts.Voting_Dapp.count.checked_add(1).unwrap();
    Ok(())
  }

  pub fn initialize(_ctx: Context<InitializeVotingDapp>) -> Result<()> {
    Ok(())
  }

  pub fn set(ctx: Context<Update>, value: u8) -> Result<()> {
    ctx.accounts.Voting_Dapp.count = value.clone();
    Ok(())
  }
}

#[derive(Accounts)]
pub struct InitializeVotingDapp<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  init,
  space = 8 + VotingDapp::INIT_SPACE,
  payer = payer
  )]
  pub Voting_Dapp: Account<'info, VotingDapp>,
  pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct CloseVotingDapp<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  mut,
  close = payer, // close account and return lamports to payer
  )]
  pub Voting_Dapp: Account<'info, VotingDapp>,
}

#[derive(Accounts)]
pub struct Update<'info> {
  #[account(mut)]
  pub Voting_Dapp: Account<'info, VotingDapp>,
}

#[account]
#[derive(InitSpace)]
pub struct VotingDapp {
  count: u8,
}
