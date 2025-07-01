const DATA_URL = 'plan_data.json';

export async function fetchData() {
    try {
        const response = await fetch(DATA_URL, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Could not fetch plan data:", error);
        throw error;
    }
}
