import React, { useState } from 'react';
import { Scroll, Sword, Coins, Skull, CheckSquare, XSquare } from 'lucide-react';

const QuestMenu = () => {
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [filter, setFilter] = useState('active'); // 'active' or 'completed'

  // Data Mockup Quest
  const quests = [
    {
      id: 1,
      title: "Membasmi Slime",
      description: "Para petani mengeluh tentang Slime yang memakan panen wortel mereka. Basmi 10 Slime Hijau di Ladang Timur.",
      difficulty: 1,
      rewards: { gold: 50, exp: 100, item: "Ramuan Kecil" },
      status: "completed",
      type: "hunt"
    },
    {
      id: 2,
      title: "Surat Hilang",
      description: "Tukang pos menjatuhkan surat penting di Hutan Gelap. Temukan surat itu sebelum diambil Goblin.",
      difficulty: 2,
      rewards: { gold: 120, exp: 250, item: "Sepatu Usang" },
      status: "active",
      type: "fetch"
    },
    {
      id: 3,
      title: "Raja Tikus",
      description: "Ada suara aneh di bawah tanah kedai. Selidiki dan kalahkan apapun yang ada di sana.",
      difficulty: 3,
      rewards: { gold: 500, exp: 1000, item: "Pedang Berkarat" },
      status: "active",
      type: "boss"
    },
    {
      id: 4,
      title: "Herbal Langka",
      description: "Nenek penyihir membutuhkan 5 Daun Bulan untuk ramuannya. Tumbuh hanya di malam hari.",
      difficulty: 2,
      rewards: { gold: 80, exp: 150, item: null },
      status: "active",
      type: "gather"
    }
  ];

  const filteredQuests = quests.filter(q => q.status === filter);

  // Helper untuk merender tingkat kesulitan
  const renderDifficulty = (level) => {
    return [...Array(level)].map((_, i) => (
      <Skull key={i} size={16} className="text-red-800 inline-block mr-1" />
    ));
  };

  return (
    <div className="min-h-screen bg-stone-900 p-4 font-mono flex items-center justify-center">
      {/* Import Font Pixel */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
        
        .pixel-font {
          font-family: 'VT323', monospace;
        }
        
        .pixel-corners {
          clip-path: polygon(
            0px 4px, 4px 4px, 4px 0px, 
            calc(100% - 4px) 0px, calc(100% - 4px) 4px, 100% 4px, 
            100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 
            4px 100%, 4px calc(100% - 4px), 0px calc(100% - 4px)
          );
        }

        .paper-texture {
          background-color: #f4e4bc;
          background-image: 
            linear-gradient(#e6d2a0 1px, transparent 1px),
            linear-gradient(90deg, #e6d2a0 1px, transparent 1px);
          background-size: 20px 20px;
          box-shadow: inset 0 0 40px rgba(139, 69, 19, 0.1);
        }

        .pixel-shadow {
          box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.4);
        }

        /* Scrollbar kustom retro */
        .retro-scroll::-webkit-scrollbar {
          width: 12px;
          background: #d4c49d;
        }
        .retro-scroll::-webkit-scrollbar-thumb {
          background: #8b4513;
          border: 2px solid #d4c49d;
        }
      `}</style>

      {/* Main Container - The "Board" */}
      <div className="w-full max-w-4xl h-[600px] bg-[#8b4513] p-2 pixel-corners pixel-shadow relative flex flex-col md:flex-row gap-2 border-4 border-[#5e2f0d]">
        
        {/* Decorative Screws/Nails */}
        <div className="absolute top-2 left-2 w-3 h-3 bg-[#5e2f0d] rounded-full shadow-inner z-20"></div>
        <div className="absolute top-2 right-2 w-3 h-3 bg-[#5e2f0d] rounded-full shadow-inner z-20"></div>
        <div className="absolute bottom-2 left-2 w-3 h-3 bg-[#5e2f0d] rounded-full shadow-inner z-20"></div>
        <div className="absolute bottom-2 right-2 w-3 h-3 bg-[#5e2f0d] rounded-full shadow-inner z-20"></div>

        {/* Left Panel: Quest List */}
        <div className="w-full md:w-1/3 bg-[#d4c49d] border-4 border-[#5e2f0d] flex flex-col relative z-10">
          {/* Header */}
          <div className="bg-[#5e2f0d] text-[#f4e4bc] p-3 text-center pixel-font text-3xl tracking-widest border-b-4 border-[#3e1f08]">
            DAFTAR MISI
          </div>

          {/* Filters */}
          <div className="flex border-b-4 border-[#5e2f0d]">
            <button 
              onClick={() => setFilter('active')}
              className={`flex-1 p-2 pixel-font text-xl text-center transition-colors ${filter === 'active' ? 'bg-[#f4e4bc] text-[#5e2f0d]' : 'bg-[#a69676] text-[#3e1f08] hover:bg-[#b8a888]'}`}
            >
              AKTIF
            </button>
            <button 
              onClick={() => setFilter('completed')}
              className={`flex-1 p-2 pixel-font text-xl text-center transition-colors border-l-4 border-[#5e2f0d] ${filter === 'completed' ? 'bg-[#f4e4bc] text-[#5e2f0d]' : 'bg-[#a69676] text-[#3e1f08] hover:bg-[#b8a888]'}`}
            >
              SELESAI
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 retro-scroll bg-[#d4c49d]">
            {filteredQuests.length === 0 ? (
              <div className="text-center pixel-font text-xl text-[#8b4513] mt-10 opacity-70">
                - Tidak ada misi -
              </div>
            ) : (
              filteredQuests.map((quest) => (
                <div 
                  key={quest.id}
                  onClick={() => setSelectedQuest(quest)}
                  className={`cursor-pointer p-2 border-2 pixel-font text-xl transition-all relative ${selectedQuest?.id === quest.id ? 'bg-[#f4e4bc] border-[#8b4513] translate-x-1' : 'bg-[#e6d2a0] border-[#b09b75] hover:border-[#8b4513] hover:bg-[#ebdcb0]'}`}
                >
                  <div className="flex justify-between items-center text-[#3e1f08]">
                    <span className="truncate pr-2">{quest.title}</span>
                    {quest.status === 'completed' && <CheckSquare size={16} className="text-green-700"/>}
                    {quest.status === 'active' && <Scroll size={16} className="text-[#8b4513]"/>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Detail Paper */}
        <div className="flex-1 relative p-1 md:pl-2">
          {selectedQuest ? (
            <div className="h-full paper-texture border-4 border-[#d4c49d] p-6 text-[#3e1f08] relative shadow-[10px_10px_0px_0px_rgba(0,0,0,0.2)] rotate-1 transition-transform hover:rotate-0 duration-300">
              
              {/* Pin or Tape graphic */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-[#e6d2a0] opacity-80 border-2 border-[#d4c49d] shadow-sm rotate-1"></div>

              {/* Title */}
              <h2 className="pixel-font text-4xl mb-4 border-b-2 border-[#8b4513] pb-2 flex items-center gap-3">
                {selectedQuest.type === 'hunt' && <Sword size={32} />}
                {selectedQuest.type === 'fetch' && <Scroll size={32} />}
                {selectedQuest.type === 'boss' && <Skull size={32} />}
                {selectedQuest.type === 'gather' && <Coins size={32} />}
                {selectedQuest.title}
              </h2>

              {/* Difficulty */}
              <div className="mb-6 flex items-center gap-2 pixel-font text-2xl">
                <span className="text-[#8b4513]">Tingkat Kesulitan:</span>
                <div className="flex">{renderDifficulty(selectedQuest.difficulty)}</div>
              </div>

              {/* Description Body */}
              <div className="mb-8 pixel-font text-2xl leading-relaxed min-h-[100px]">
                {selectedQuest.description}
              </div>

              {/* Rewards Box */}
              <div className="border-2 border-dashed border-[#8b4513] p-4 bg-[#fdf6e3] bg-opacity-50">
                <h3 className="pixel-font text-2xl mb-2 text-[#8b4513] underline decoration-wavy">HADIAH:</h3>
                <div className="flex flex-wrap gap-4 pixel-font text-xl">
                  <div className="flex items-center gap-1">
                    <Coins size={18} className="text-yellow-600" />
                    <span>{selectedQuest.rewards.gold} Gold</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-blue-700 font-bold">XP</span>
                    <span>{selectedQuest.rewards.exp} Exp</span>
                  </div>
                  {selectedQuest.rewards.item && (
                    <div className="flex items-center gap-1 text-purple-800">
                      <span>🎁 {selectedQuest.rewards.item}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Stamp */}
              {selectedQuest.status === 'completed' && (
                <div className="absolute bottom-10 right-10 border-4 border-red-700 text-red-700 p-2 transform -rotate-12 opacity-80">
                  <div className="pixel-font text-3xl font-bold tracking-widest uppercase">SELESAI</div>
                </div>
              )}

              {/* Action Button (Only for active) */}
              {selectedQuest.status === 'active' && (
                <div className="absolute bottom-6 right-6">
                  <button className="bg-[#8b4513] text-[#f4e4bc] pixel-font text-2xl py-2 px-6 hover:bg-[#5e2f0d] active:translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] border-2 border-[#3e1f08]">
                    TERIMA
                  </button>
                </div>
              )}

            </div>
          ) : (
            /* Empty State */
            <div className="h-full flex items-center justify-center text-[#d4c49d] opacity-50">
              <div className="text-center">
                <Scroll size={64} className="mx-auto mb-4" />
                <p className="pixel-font text-2xl">Pilih misi dari daftar...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestMenu;