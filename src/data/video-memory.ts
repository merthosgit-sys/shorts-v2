import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";


const MEMORY_FILE =
"./output/video-memory.json";



export interface VideoMemory {

title:string;

topic:string;

hook:string;

angle:string;

createdAt:string;

}



async function loadMemory():Promise<VideoMemory[]> {


if(!existsSync(MEMORY_FILE)){

return [];

}


try{

return JSON.parse(
await readFile(
MEMORY_FILE,
"utf8"
)
);


}catch{

return [];

}


}





async function saveMemory(
data:VideoMemory[]
){

await writeFile(
MEMORY_FILE,
JSON.stringify(
data,
null,
2
),
"utf8"
);


}





export async function hasVideo(
title:string
){


const memory =
await loadMemory();


return memory.some(
x =>
x.title.toLowerCase()
===
title.toLowerCase()
);


}





export async function addVideo(
video:VideoMemory
){


const memory =
await loadMemory();


memory.push(video);


await saveMemory(memory);


}





export async function getUsedTitles(){


const memory =
await loadMemory();


return memory.map(
x=>x.title
);


}
