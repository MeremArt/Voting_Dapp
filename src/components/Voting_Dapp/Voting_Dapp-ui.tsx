"use client";

import {
  AwaitedReactNode,
  JSXElementConstructor,
  Key,
  ReactElement,
  ReactNode,
  ReactPortal,
  useState,
} from "react";
import { toast } from "react-hot-toast";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  useCreatePoll,
  usePolls,
  useRegisterCandidate,
  usePollCandidates,
  useCastVote,
  useHasVoted,
} from "./useVotingDappProgram";
import { ExplorerLink } from "../cluster/cluster-ui";

// Component to create a new poll
export function VotingDappCreate() {
  const [description, setDescription] = useState("");
  const [pollStart, setPollStart] = useState("");
  const [pollEnd, setPollEnd] = useState("");
  const { mutate, isPending } = useCreatePoll();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Generate a random poll ID
    const pollId = Math.floor(Math.random() * 1000000);

    // Convert dates to UNIX timestamps
    const startTime = new Date(pollStart).getTime() / 1000;
    const endTime = new Date(pollEnd).getTime() / 1000;

    mutate(
      {
        pollId,
        description,
        pollStart: startTime,
        pollEnd: endTime,
      },
      {
        onSuccess: () => {
          toast.success("Poll created successfully!");
          setDescription("");
          setPollStart("");
          setPollEnd("");
        },
        onError: (error: Error) => {
          toast.error(`Error creating poll: ${error.message}`);
        },
      }
    );
  };

  return (
    <div className="card bg-base-200 shadow-xl mb-8">
      <div className="card-body">
        <h2 className="card-title">Create New Poll</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Poll Description</span>
            </label>
            <input
              type="text"
              placeholder="Enter poll description"
              className="input input-bordered"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Start Date</span>
            </label>
            <input
              type="datetime-local"
              className="input input-bordered"
              value={pollStart}
              onChange={(e) => setPollStart(e.target.value)}
              required
            />
          </div>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">End Date</span>
            </label>
            <input
              type="datetime-local"
              className="input input-bordered"
              value={pollEnd}
              onChange={(e) => setPollEnd(e.target.value)}
              required
            />
          </div>
          <div className="card-actions justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isPending}
            >
              {isPending ? "Creating..." : "Create Poll"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Component to display a list of all polls
export function VotingDappList() {
  const { data: polls, isLoading, error } = usePolls();

  if (isLoading) {
    return <div className="text-center p-4">Loading polls...</div>;
  }

  if (error) {
    return <div className="alert alert-error">Error loading polls</div>;
  }

  if (!polls || polls.length === 0) {
    return (
      <div className="text-center p-4">
        No polls found. Create one to get started!
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h2 className="text-2xl font-bold mb-4">Available Polls</h2>
      <div className="space-y-4">
        {polls.map((poll: PollData) => (
          <PollItem key={poll.address} poll={poll} />
        ))}
      </div>
    </div>
  );
}

// Type definition for poll data
interface PollData {
  address: string;
  description?: string; // Made optional to match the data structure
  pollId: number;
  pollStart: number;
  pollEnd: number;
  candidateAmount: number;
  votesCast: number;
}

// Component to display a single poll with its candidates
function PollItem({ poll }: { poll: PollData }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [candidateName, setCandidateName] = useState("");

  // Format dates
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Check if poll is active
  const isActive = () => {
    const now = Date.now() / 1000;
    return now >= poll.pollStart && now <= poll.pollEnd;
  };

  // Get poll status
  const getStatus = () => {
    const now = Date.now() / 1000;
    if (now < poll.pollStart) return "Not started";
    if (now > poll.pollEnd) return "Ended";
    return "Active";
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title">{poll.description}</h3>
        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
          <div>
            Status:{" "}
            <span
              className={`badge ${
                getStatus() === "Active"
                  ? "badge-success"
                  : getStatus() === "Ended"
                  ? "badge-error"
                  : "badge-warning"
              }`}
            >
              {getStatus()}
            </span>
          </div>
          <div>Total Votes: {poll.votesCast}</div>
          <div>Start: {formatDate(poll.pollStart)}</div>
          <div>End: {formatDate(poll.pollEnd)}</div>
        </div>
        <div className="text-xs mb-2">
          <ExplorerLink
            path={`account/${poll.address}`}
            label={`Poll: ${poll.address}`}
          />
        </div>
        <div className="card-actions justify-end">
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide Details" : "View Details"}
          </button>
        </div>

        {expanded && (
          <div className="mt-4">
            <PollCandidates
              pollAddress={poll.address}
              isActive={isActive()}
              onAddCandidateClick={() => setShowAddCandidate(!showAddCandidate)}
            />

            {showAddCandidate && (
              <div className="mt-4 p-4 border rounded-lg">
                <AddCandidateForm
                  pollAddress={poll.address}
                  candidateName={candidateName}
                  setCandidateName={setCandidateName}
                  onSuccess={() => {
                    setCandidateName("");
                    setShowAddCandidate(false);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Component to display candidates for a poll
function PollCandidates({
  pollAddress,
  isActive,
  onAddCandidateClick,
}: {
  pollAddress: string;
  isActive: boolean;
  onAddCandidateClick: () => void;
}) {
  const { data: candidates, isLoading } = usePollCandidates(pollAddress);
  const { data: hasVoted } = useHasVoted(pollAddress);

  if (isLoading) {
    return <div className="text-center p-4">Loading candidates...</div>;
  }

  if (!candidates || candidates.length === 0) {
    return (
      <div className="mt-4">
        <div className="alert alert-info">
          No candidates registered for this poll yet.
        </div>
        <div className="mt-2">
          <button
            className="btn btn-sm btn-primary"
            onClick={onAddCandidateClick}
          >
            Register as Candidate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold">Candidates</h4>
        <button
          className="btn btn-sm btn-outline"
          onClick={onAddCandidateClick}
        >
          Add Candidate
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Name</th>
              <th>Votes</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map(
              (
                candidate: {
                  address: Key | null | undefined;
                  candidateName:
                    | string
                    | number
                    | bigint
                    | boolean
                    | ReactElement<any, string | JSXElementConstructor<any>>
                    | Iterable<ReactNode>
                    | ReactPortal
                    | Promise<AwaitedReactNode>
                    | null
                    | undefined;
                  voteCount:
                    | string
                    | number
                    | bigint
                    | boolean
                    | ReactElement<any, string | JSXElementConstructor<any>>
                    | Iterable<ReactNode>
                    | ReactPortal
                    | Promise<AwaitedReactNode>
                    | null
                    | undefined;
                },
                index: number
              ) => (
                <tr key={candidate.address}>
                  <td>{candidate.candidateName}</td>
                  <td>{candidate.voteCount}</td>
                  <td>
                    {isActive && !hasVoted && (
                      <VoteButton
                        pollAddress={pollAddress}
                        candidateId={index}
                      />
                    )}
                    {hasVoted && (
                      <span className="text-sm text-gray-500">
                        Already voted
                      </span>
                    )}
                    {!isActive && (
                      <span className="text-sm text-gray-500">
                        Poll {getStatus(pollAddress)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper function to get poll status
function getStatus(pollAddress: string) {
  // In a real app, you'd fetch the poll data and determine the status
  return "inactive";
}

// Component to add a new candidate
function AddCandidateForm({
  pollAddress,
  candidateName,
  setCandidateName,
  onSuccess,
}: {
  pollAddress: string;
  candidateName: string;
  setCandidateName: (name: string) => void;
  onSuccess: () => void;
}) {
  const { mutate, isPending } = useRegisterCandidate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    mutate(
      {
        poll: new PublicKey(pollAddress),
        candidateName,
      },
      {
        onSuccess: () => {
          toast.success("Candidate registered successfully!");
          onSuccess();
        },
        onError: (error: Error) => {
          toast.error(`Error registering candidate: ${error.message}`);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-control">
        <label className="label">
          <span className="label-text">Candidate Name</span>
        </label>
        <input
          type="text"
          placeholder="Enter candidate name"
          className="input input-bordered w-full"
          value={candidateName}
          onChange={(e) => setCandidateName(e.target.value)}
          required
        />
      </div>
      <div className="mt-4 flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "Registering..." : "Register Candidate"}
        </button>
      </div>
    </form>
  );
}

// Component to cast a vote
function VoteButton({
  pollAddress,
  candidateId,
}: {
  pollAddress: string;
  candidateId: number;
}) {
  const { mutate, isPending } = useCastVote();

  const handleVote = () => {
    mutate(
      {
        poll: new PublicKey(pollAddress),
        candidateId,
      },
      {
        onSuccess: () => {
          toast.success("Vote cast successfully!");
        },
        onError: (error: Error) => {
          toast.error(`Error casting vote: ${error.message}`);
        },
      }
    );
  };

  return (
    <button
      className="btn btn-xs btn-success"
      onClick={handleVote}
      disabled={isPending}
    >
      {isPending ? "Voting..." : "Vote"}
    </button>
  );
}
