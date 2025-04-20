import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Home, Trophy, Users } from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState("home");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-yellow-100 border-b">
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-yellow-600">Yellow Car Game</h2>
          <SignOutButton />
        </div>
      </header>
      
      <main className="flex-1 p-4 pb-20">
        <div className="max-w-md mx-auto">
          <Content currentTab={currentTab} />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-yellow-100 border-t flex items-center">
        <button
          onClick={() => setCurrentTab("home")}
          className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${
            currentTab === "home"
              ? "text-yellow-800"
              : "text-yellow-700 hover:text-yellow-800"
          }`}
        >
          <Home size={24} />
          <span className="text-xs">Home</span>
        </button>
        <Authenticated>
          <button
            onClick={() => setCurrentTab("leaderboard")}
            className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${
              currentTab === "leaderboard"
                ? "text-yellow-800"
                : "text-yellow-700 hover:text-yellow-800"
            }`}
          >
            <Trophy size={24} />
            <span className="text-xs">Leaderboard</span>
          </button>
          <button
            onClick={() => setCurrentTab("friends")}
            className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${
              currentTab === "friends"
                ? "text-yellow-800"
                : "text-yellow-700 hover:text-yellow-800"
            }`}
          >
            <Users size={24} />
            <span className="text-xs">Friends</span>
          </button>
        </Authenticated>
      </nav>
      
      <Toaster />
    </div>
  );
}

function Content({ currentTab }: { currentTab: string }) {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const carSpots = useQuery(api.cars.getCarSpots);
  const leaderboard = useQuery(api.cars.getLeaderboard);  // For user's total points
  const friends = useQuery(api.friends.getFriends);
  const generateUploadUrl = useMutation(api.cars.generateUploadUrl);
  const submitCar = useMutation(api.cars.submitCar);
  const addFriend = useMutation(api.friends.addFriend);
  
  const [description, setDescription] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Get the user's score from leaderboard query (assuming it includes the current user)
  const userScore = leaderboard?.find(score => score.userId === loggedInUser?._id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileInput.current?.files?.[0]) return;
    
    setUploading(true);
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": fileInput.current.files[0].type },
        body: fileInput.current.files[0],
      });
      const { storageId } = await result.json();
      await submitCar({ imageId: storageId, description });
      setDescription("");
      if (fileInput.current) fileInput.current.value = "";
    } catch (error) {
      console.error(error);
    }
    setUploading(false);
  }

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addFriend({ friendEmail });
      setFriendEmail("");
      toast.success("Friend added successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add friend");
    }
  }

  if (loggedInUser === undefined) {
    return <div>Loading...</div>;
  }

  if (currentTab === "friends") {
    return (
      <div className="flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-yellow-600 mb-4">Friends</h1>
          <p className="text-lg text-slate-600">Add and view your friends</p>
        </div>

        <Authenticated>
          <form onSubmit={handleAddFriend} className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Add a Friend</h3>
            <div className="flex gap-2">
              <input
                type="email"
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
                placeholder="Friend's email"
                className="flex-1 border p-2 rounded"
              />
              <button
                type="submit"
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
              >
                Add
              </button>
            </div>
          </form>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <h3 className="text-lg font-semibold p-4 border-b">Your Friends</h3>
            {friends?.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">
                No friends yet. Add some friends to compete with!
              </p>
            ) : (
              friends?.map((friendship) => (
                <div
                  key={friendship._id}
                  className="flex items-center justify-between p-4 border-b last:border-b-0"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{friendship.friend.email}</span>
                    <span className="text-sm text-gray-500">
                      {friendship.friend.totalSpots} spots
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-yellow-600">
                      {friendship.friend.totalPoints}
                    </span>
                    <span className="text-sm text-gray-500">points</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Authenticated>

        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
      </div>
    );
  }

  if (currentTab === "leaderboard") {
    return (
      <div className="flex flex-col items-center gap-8 bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-yellow-600 mb-4">Leaderboard</h1>
          <p className="text-lg text-slate-600">Top Yellow Car Spotters</p>
        </div>

        <Authenticated>
          <div className="w-full">
            {leaderboard?.map((score, index) => (
              <div
                key={score._id}
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow mb-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-500" : index === 2 ? "bg-amber-700" : "bg-gray-400"
                    }`}
                  >
                    {score.image ? (
                      <img
                        src={score.image}
                        alt={score.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{score.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-lg">{score.username}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-yellow-600">{score.totalPoints}</span>
                  <span className="text-sm text-gray-500">points</span>
                </div>
              </div>
            ))}
          </div>
        </Authenticated>

        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-yellow-600 mb-4">Spot Yellow Cars!</h1>
        <Authenticated>
          <p className="text-lg text-slate-600">Welcome, {loggedInUser?.email}!</p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-lg text-slate-600">Sign in to start spotting</p>
        </Unauthenticated>
      </div>

      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>

      <Authenticated>
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold text-yellow-600">Total Points</h3>
            <p className="text-xl font-bold">{userScore?.totalPoints ?? 0} points</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold text-yellow-600">Achievements</h3>
            <p className="text-sm text-gray-500">Placeholder: You've spotted {carSpots?.length ?? 0} cars! Add more achievements in the future.</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold text-yellow-600">Upload History</h3>
            <div className="grid grid-cols-2 gap-4">
              {carSpots?.map((spot) => (
                <div key={spot._id} className="bg-white rounded-lg shadow p-2">
                  {spot.imageUrl && (
                    <img
                      src={spot.imageUrl}
                      alt="Yellow car spot"
                      className="w-full h-24 object-cover rounded-full"
                    />
                  )}
                  <p className="mt-2 text-sm">{spot.description}</p>
                  <p className="text-yellow-600">+{spot.points} points</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 mt-4">
            <h3 className="text-lg font-semibold">Submit a Yellow Car</h3>
            <input
              type="file"
              accept="image/*"
              ref={fileInput}
              className="border p-2 rounded"
              disabled={uploading}
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Where did you spot it?"
              className="border p-2 rounded mt-2"
              disabled={uploading}
            />
            <button
              type="submit"
              disabled={uploading}
              className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 disabled:bg-gray-300 mt-2"
            >
              {uploading ? "Uploading..." : "Submit"}
            </button>
          </form>
        </div>
      </Authenticated>
    </div>
  );
}
