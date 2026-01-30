import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface Stage {
  id: string;
  name: string;
  stageNumber: number;
  imageUrl: string | null;
  requiredLevel: number;
  isUnlocked: boolean;
}

interface StageApiResponse {
  id: string;
  name: string;
  stage_number: number;
  image_url: string | null;
  required_level: number;
  is_unlocked: boolean;
}

export function useStages() {
  const { address, isConnected } = useAccount();
  const [stages, setStages] = useState<Stage[]>([]);
  const [currentStage, setCurrentStage] = useState<Stage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        setLoading(true);
        
        // Fetch current stage if connected
        if (isConnected && address) {
          const currentResponse = await fetch('/api/stages?current=true', {
            headers: {
              'x-wallet-address': address,
            },
          });

          if (currentResponse.ok) {
            const currentData = await currentResponse.json();
            if (currentData.stage) {
              setCurrentStage({
                id: currentData.stage.id,
                name: currentData.stage.name,
                stageNumber: currentData.stage.stage_number,
                imageUrl: currentData.stage.image_url,
                requiredLevel: currentData.stage.required_level,
                isUnlocked: currentData.stage.is_unlocked,
              });
            }
          }
        }

        // Fetch all stages
        const response = await fetch('/api/stages');

        if (!response.ok) {
          throw new Error('Failed to fetch stages');
        }

        const data = await response.json();
        const formatted = data.stages.map((stage: StageApiResponse) => ({
          id: stage.id,
          name: stage.name,
          stageNumber: stage.stage_number,
          imageUrl: stage.image_url,
          requiredLevel: stage.required_level,
          isUnlocked: stage.is_unlocked,
        }));
        setStages(formatted);
        setError(null);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setStages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStages();
  }, [address, isConnected]);

  return { stages, currentStage, loading, error };
}

