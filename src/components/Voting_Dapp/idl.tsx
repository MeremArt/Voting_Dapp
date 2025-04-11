const idl = {
  version: "0.1.0",
  name: "voting_dapp",
  instructions: [
    {
      name: "castVote",
      accounts: [
        {
          name: "poll",
          isMut: true,
          isSigner: false,
        },
        {
          name: "voter",
          isMut: true,
          isSigner: false,
        },
        {
          name: "candidate",
          isMut: true,
          isSigner: false,
        },
        {
          name: "user",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "candidateId",
          type: "u32",
        },
      ],
    },
    {
      name: "initializePoll",
      accounts: [
        {
          name: "poll",
          isMut: true,
          isSigner: false,
        },
        {
          name: "user",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "pollId",
          type: "u64",
        },
        {
          name: "description",
          type: "string",
        },
        {
          name: "pollStart",
          type: "u64",
        },
        {
          name: "pollEnd",
          type: "u64",
        },
      ],
    },
    {
      name: "registerCandidate",
      accounts: [
        {
          name: "poll",
          isMut: true,
          isSigner: false,
        },
        {
          name: "candidate",
          isMut: true,
          isSigner: false,
        },
        {
          name: "user",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "candidateName",
          type: "string",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "Candidate",
      type: {
        kind: "struct",
        fields: [
          {
            name: "poll",
            type: "pubkey",
          },
          {
            name: "candidateName",
            type: "string",
          },
          {
            name: "voteCount",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "Poll",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pollId",
            type: "u64",
          },
          {
            name: "description",
            type: "string",
          },
          {
            name: "pollStart",
            type: "u64",
          },
          {
            name: "pollEnd",
            type: "u64",
          },
          {
            name: "candidateAmount",
            type: "u64",
          },
          {
            name: "votesCast",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "Voter",
      type: {
        kind: "struct",
        fields: [
          {
            name: "poll",
            type: "pubkey",
          },
          {
            name: "voter",
            type: "pubkey",
          },
          {
            name: "selectedOption",
            type: "u32",
          },
          {
            name: "hasVoted",
            type: "bool",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "InvalidPollDuration",
      msg: "Poll duration is invalid.",
    },
    {
      code: 6001,
      name: "AlreadyVoted",
      msg: "You have already voted.",
    },
    {
      code: 6002,
      name: "Overflow",
      msg: "Math operation overflowed.",
    },
  ],
  address: "HQDGJJfXcwNg8MqA3bLd3GFSxJMwPQhhnz9ZDnyTqbY",
};

export default idl;
