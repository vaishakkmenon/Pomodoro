import { auth } from "@clerk/nextjs/server";
import { addAllowedUser, removeAllowedUser, getAllowedUsers } from "@/app/actions/admin";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function AdminPage() {
    const { userId } = await auth();

    const adminId = process.env.CLERK_ADMIN_USER_ID;

    if (!userId || userId !== adminId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white">
                <Link href="/" className="absolute top-4 left-4 text-white/50 hover:text-white flex items-center gap-2 transition-colors">
                    <ArrowLeft size={20} />
                    Back to App
                </Link>
                <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
                <p>You do not have permission to access this page.</p>
                <p className="text-sm mt-4 text-white/50">Current ID: {userId}</p>
            </div>
        );
    }

    const allowed = await getAllowedUsers();

    async function handleAdd(formData: FormData) {
        "use server";
        const email = formData.get("email") as string;
        const notes = formData.get("notes") as string;
        await addAllowedUser(email, notes);
    }

    async function handleRemove(formData: FormData) {
        "use server";
        const email = formData.get("email") as string;
        await removeAllowedUser(email);
    }

    return (
        <div className="min-h-screen text-white p-8 max-w-4xl mx-auto pt-24 relative">
            <Link href="/" className="absolute top-8 left-8 text-white/50 hover:text-white flex items-center gap-2 transition-colors">
                <ArrowLeft size={20} />
                Back to App
            </Link>
            <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Add Allowed User</h2>
                <form action={handleAdd} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-white/70 mb-1">Email</label>
                        <input
                            name="email"
                            type="email"
                            required
                            className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-white/70 mb-1">Notes (Optional)</label>
                        <input
                            name="notes"
                            type="text"
                            className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2 rounded-lg transition-colors h-[42px]"
                    >
                        Add User
                    </button>
                </form>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Allowed Users ({allowed.length})</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="p-4 font-medium text-white/70">Email</th>
                                <th className="p-4 font-medium text-white/70">Notes</th>
                                <th className="p-4 font-medium text-white/70">Date Added</th>
                                <th className="p-4 font-medium text-white/70">Status</th>
                                <th className="p-4 font-medium text-white/70">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allowed.map((u) => (
                                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4">{u.email}</td>
                                    <td className="p-4 text-white/60">{u.notes || "-"}</td>
                                    <td className="p-4 text-white/60">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs ${u.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                            {u.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <form action={handleRemove}>
                                            <input type="hidden" name="email" value={u.email} />
                                            <button
                                                type="submit"
                                                className="text-red-400 hover:text-red-300 text-sm hover:underline"
                                            >
                                                Remove
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            ))}
                            {allowed.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-white/50">
                                        No users allowed yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 text-right text-xs text-white/30">
                Admin ID: {adminId}
            </div>
        </div>
    );
}
