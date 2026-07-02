export type ExerciseCatalogItem = {
  id: number;
  name: string;
  category: string;
  muscles: string[];
  equipment: string[];
};

type WgerExerciseInfo = {
  id: number;
  category?: { name?: string } | number;
  muscles?: Array<{ name_en?: string; name?: string }>;
  muscles_secondary?: Array<{ name_en?: string; name?: string }>;
  equipment?: Array<{ name?: string }>;
  translations?: Array<{ name?: string; language?: number }>;
};

let exerciseCatalogPromise: Promise<ExerciseCatalogItem[]> | null = null;

async function fetchExercisePage(offset: number, limit: number) {
  const response = await fetch(`https://wger.de/api/v2/exerciseinfo/?language=2&limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error(`Exercise API request failed with ${response.status}`);
  }
  return response.json() as Promise<{ count: number; results: WgerExerciseInfo[] }>;
}

export async function loadExerciseCatalog(): Promise<ExerciseCatalogItem[]> {
  if (!exerciseCatalogPromise) {
    exerciseCatalogPromise = (async () => {
      const limit = 100;
      const firstPage = await fetchExercisePage(0, limit);
      const pages = [firstPage];
      const totalPages = Math.ceil(firstPage.count / limit);

      for (let pageIndex = 1; pageIndex < totalPages; pageIndex += 1) {
        pages.push(await fetchExercisePage(pageIndex * limit, limit));
      }

      return pages.flatMap((page) => page.results).map((exercise) => ({
        id: exercise.id,
        name: exercise.translations?.find((translation) => translation.language === 2)?.name
          || exercise.translations?.[0]?.name
          || 'Unnamed exercise',
        category: typeof exercise.category === 'object' ? exercise.category?.name || 'General' : 'General',
        muscles: [...(exercise.muscles || []), ...(exercise.muscles_secondary || [])]
          .map((muscle) => muscle.name_en || muscle.name || '')
          .filter(Boolean),
        equipment: (exercise.equipment || []).map((item) => item.name || '').filter(Boolean),
      }));
    })();
  }

  return exerciseCatalogPromise;
}