use anchor_lang::prelude::*;
#[error_code]
pub enum CustomError {
    #[msg("Poll duration is invalid.")]
    InvalidPollDuration,
    #[msg("You have already voted.")]
    AlreadyVoted,
    #[msg("Math operation overflowed.")]
    Overflow,
}