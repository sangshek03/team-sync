'use client'

import { useState } from 'react'

interface CreateTeamModalProps {
    onClose: () => void
    onSuccess: (message: string) => void
    onError: (message: string) => void
}

export default function CreateTeamModal({
    onClose,
    onSuccess,
    onError,
}: CreateTeamModalProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch('/api/teams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ name, description }),
            })

            const data = await response.json()

            if (response.ok && data.success) {
                onSuccess('Team created successfully!')
            } else {
                onError(data.message || 'Failed to create team')
            }
        } catch (_err) {
            onError('An error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-yellow-900/20 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 animate-slideUp">
                {/* Header */}
                <div className="bg-[#FFA4A4] text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
                    <h2 className="text-xl font-bold">Create Team</h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 transition-colors"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label
                            htmlFor="teamName"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Team Name
                        </label>
                        <input
                            id="teamName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA4A4] focus:border-transparent transition-all duration-200 outline-none"
                            placeholder="Enter team name"
                        />
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor="teamDescription"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Description
                        </label>
                        <textarea
                            id="teamDescription"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA4A4] focus:border-transparent transition-all duration-200 outline-none resize-none"
                            placeholder="Enter team description (optional)"
                        />
                    </div>

                    <div className="flex space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-all duration-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-[#FFA4A4] hover:bg-[#FFBDBD] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? 'Creating...' : 'Create Team'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
