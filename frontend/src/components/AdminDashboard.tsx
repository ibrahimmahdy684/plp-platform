import React, { useMemo, useState } from 'react';
import { Shield, LogOut, PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { gamesApi, QuestionData } from '../services/api';

type GameType = 'Math' | 'Physics' | 'Language' | 'Coding';
type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
type AgeGroup = '3-5' | '6-8' | '9-12';

interface AdminDashboardProps {
  adminName: string;
  onLogout: () => void;
}

export function AdminDashboard({ adminName, onLogout }: AdminDashboardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    gameType: 'Math' as GameType,
    difficultyLevel: 'Easy' as DifficultyLevel,
    maxPoints: 100,
    appropriateAgeGroups: ['6-8'] as AgeGroup[],
    icon: '🎮',
  });
  const [questions, setQuestions] = useState<QuestionData[]>([
    { question: '', options: ['', '', '', ''], correctAnswer: 0, hint: '', points: 20 },
  ]);

  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.description.trim().length > 0 &&
      form.maxPoints >= 10 &&
      form.appropriateAgeGroups.length > 0
    );
  }, [form]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { question: '', options: ['', '', '', ''], correctAnswer: 0, hint: '', points: 20 },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestionField = (index: number, patch: Partial<QuestionData>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        const nextOptions = [...q.options];
        nextOptions[optionIndex] = value;
        return { ...q, options: nextOptions };
      })
    );
  };

  const toggleAgeGroup = (ageGroup: AgeGroup) => {
    setForm((prev) => {
      const exists = prev.appropriateAgeGroups.includes(ageGroup);
      return {
        ...prev,
        appropriateAgeGroups: exists
          ? prev.appropriateAgeGroups.filter((a) => a !== ageGroup)
          : [...prev.appropriateAgeGroups, ageGroup],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error('Please fill all required fields');
      return;
    }

    const cleanedQuestions = questions
      .map((q) => ({
        question: q.question?.trim() || '',
        options: (q.options || []).map((o) => o?.trim() || ''),
        correctAnswer: Number.isFinite(q.correctAnswer) ? q.correctAnswer : 0,
        hint: q.hint?.trim() || '',
        points: Number(q.points) || 20,
      }))
      .filter((q) => {
        const nonEmptyOptions = q.options.filter(Boolean);
        return q.question.length > 0 && nonEmptyOptions.length >= 2;
      })
      .map((q) => ({
        ...q,
        // Keep only non-empty options
        options: q.options.filter(Boolean),
        // Clamp correctAnswer index
        correctAnswer: Math.min(Math.max(0, q.correctAnswer), Math.max(0, q.options.filter(Boolean).length - 1)),
      }));

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        gameType: form.gameType,
        difficultyLevel: form.difficultyLevel,
        maxPoints: Number(form.maxPoints),
        appropriateAgeGroups: form.appropriateAgeGroups,
        icon: form.icon?.trim() || '🎮',
        questions: cleanedQuestions.length > 0 ? cleanedQuestions : undefined,
      };

      const result = await gamesApi.create(payload);
      if (result.success) {
        toast.success('Game created successfully');
        setForm({
          name: '',
          description: '',
          gameType: 'Math',
          difficultyLevel: 'Easy',
          maxPoints: 100,
          appropriateAgeGroups: ['6-8'],
          icon: '🎮',
        });
        setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0, hint: '', points: 20 }]);
      } else {
        toast.error(result.message || 'Failed to create game');
      }
    } catch (error) {
      console.error('Create game error:', error);
      toast.error('Failed to create game');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 border-4 border-blue-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-purple-800">System Admin</h1>
                <p className="text-gray-600">Hello, {adminName}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 border-4 border-purple-200">
          <h2 className="text-purple-800 mb-4 flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-purple-600" />
            Add a Game
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-purple-800 font-semibold mb-2">Game Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none"
                placeholder="e.g., Number Adventure"
                required
              />
            </div>

            <div>
              <label className="block text-purple-800 font-semibold mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none min-h-[110px]"
                placeholder="What will kids do in this game?"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-purple-800 font-semibold mb-2">Game Type</label>
                <select
                  value={form.gameType}
                  onChange={(e) => setForm((p) => ({ ...p, gameType: e.target.value as GameType }))}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none"
                >
                  <option value="Math">Math</option>
                  <option value="Physics">Physics</option>
                  <option value="Language">Language</option>
                  <option value="Coding">Coding</option>
                </select>
              </div>

              <div>
                <label className="block text-purple-800 font-semibold mb-2">Difficulty</label>
                <select
                  value={form.difficultyLevel}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, difficultyLevel: e.target.value as DifficultyLevel }))
                  }
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-purple-800 font-semibold mb-2">Max Points</label>
                <input
                  type="number"
                  min={10}
                  value={form.maxPoints}
                  onChange={(e) => setForm((p) => ({ ...p, maxPoints: Number(e.target.value) }))}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-purple-800 font-semibold mb-2">Age Groups</label>
              <div className="flex flex-wrap gap-3">
                {(['3-5', '6-8', '9-12'] as AgeGroup[]).map((age) => {
                  const selected = form.appropriateAgeGroups.includes(age);
                  return (
                    <button
                      key={age}
                      type="button"
                      onClick={() => toggleAgeGroup(age)}
                      className={
                        selected
                          ? 'px-4 py-2 rounded-full border-2 border-purple-500 bg-purple-100 text-purple-800'
                          : 'px-4 py-2 rounded-full border-2 border-purple-200 bg-white text-gray-700 hover:border-purple-400'
                      }
                    >
                      {age}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-purple-800 font-semibold mb-2">Icon (optional)</label>
              <input
                value={form.icon}
                onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none"
                placeholder="e.g., 🔢"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className="block text-purple-800 font-semibold">Questions (optional)</label>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-4 py-2 rounded-full border-2 border-purple-200 bg-white text-gray-700 hover:border-purple-400"
                >
                  + Add Question
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                If you add questions here, they will be saved with the game.
              </p>

              <div className="mt-4 space-y-4">
                {questions.map((q, qIndex) => (
                  <div key={qIndex} className="rounded-3xl border-4 border-purple-200 p-5 bg-white">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h3 className="text-purple-800">Question {qIndex + 1}</h3>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          className="px-4 py-2 rounded-full border-2 border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-purple-800 font-semibold mb-2">Question</label>
                        <input
                          value={q.question}
                          onChange={(e) => updateQuestionField(qIndex, { question: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none"
                          placeholder="e.g., What is 2 + 3?"
                        />
                      </div>

                      <div>
                        <label className="block text-purple-800 font-semibold mb-2">Options</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[0, 1, 2, 3].map((optIndex) => (
                            <input
                              key={optIndex}
                              value={q.options?.[optIndex] || ''}
                              onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                              className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none"
                              placeholder={`Option ${optIndex + 1}`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-purple-800 font-semibold mb-2">Correct Option</label>
                          <select
                            value={q.correctAnswer}
                            onChange={(e) => updateQuestionField(qIndex, { correctAnswer: Number(e.target.value) })}
                            className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none"
                          >
                            <option value={0}>Option 1</option>
                            <option value={1}>Option 2</option>
                            <option value={2}>Option 3</option>
                            <option value={3}>Option 4</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-purple-800 font-semibold mb-2">Points</label>
                          <input
                            type="number"
                            min={0}
                            value={q.points}
                            onChange={(e) => updateQuestionField(qIndex, { points: Number(e.target.value) })}
                            className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-purple-800 font-semibold mb-2">Hint (optional)</label>
                          <input
                            value={q.hint}
                            onChange={(e) => updateQuestionField(qIndex, { hint: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none"
                            placeholder="e.g., Count on your fingers"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-2xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5" />
                  Create Game
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
