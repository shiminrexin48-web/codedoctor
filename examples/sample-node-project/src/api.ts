export async function loadData() {
  try {
    return await fetch('http://localhost:3000/api/items');
  } catch (error) {}
}

export const API_KEY = process.env.DEMO_API_KEY;
