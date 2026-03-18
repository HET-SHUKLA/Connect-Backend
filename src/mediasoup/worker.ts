import mediasoup from "mediasoup"
import os from "os";

const workers: mediasoup.types.Worker[] = []
let workerIndex = 0

export async function createWorkers() {
    // Create a worker for each CPU core
    const numWorkers = os.cpus().length;
    for (let i = 0; i < numWorkers; i++) {
        const worker = await mediasoup.createWorker();

        worker.on("died", () => {
            console.error(`Worker ${worker.pid} died. Exiting...`);
            process.exit(1);
        });

        workers.push(worker);
        console.log(`Worker ${worker.pid} created`);
    }
}

export function getWorker(): mediasoup.types.Worker {
    // Round-robin selection of workers
    const worker = workers[workerIndex];
    if (!worker) {
        throw new Error("No mediasoup workers available");
    }

    workerIndex = (workerIndex + 1) % workers.length;
    return worker;
}