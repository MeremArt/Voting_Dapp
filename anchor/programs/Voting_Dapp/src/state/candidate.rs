#[account]
#[derive(Default)]
pub struct Candidate {
    pub poll: Pubkey,
    pub candidate_name: String,
    pub vote_count: u64,
}

impl Candidate {
    // 8 (discriminator) + 32 (poll) + 4 + 100 (candidate name, assume max 100 chars) + 8 (vote_count)
    pub const INIT_SPACE: usize = 8 + 32 + 4 + 100 + 8;
}