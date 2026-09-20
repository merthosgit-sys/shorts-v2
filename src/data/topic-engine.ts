import {
  hasVideo,
  addVideo
} from "./video-memory.js";


const SUBJECTS = {

  technology:[

    "WiFi",
    "Bluetooth",
    "GPS",
    "QR Codes",
    "Smartphones",
    "Artificial Intelligence",
    "Robots",
    "Microchips",
    "Electric Cars",
    "Satellites",
    "Internet",
    "Battery Technology",
    "Virtual Reality",
    "3D Printing"

  ],

  science:[

    "Black Holes",
    "DNA",
    "Quantum Physics",
    "Gravity",
    "Lightning",
    "Time",
    "Energy",
    "Human Brain",
    "Ocean",
    "Volcanoes"

  ],

  history:[

    "Ancient Machines",
    "Lost Inventions",
    "First Computers",
    "Old Cars",
    "Early Aviation",
    "Forgotten Scientists"

  ],

  engineering:[

    "Bridges",
    "Skyscrapers",
    "Power Plants",
    "Engines",
    "Factories",
    "Electrical Systems"

  ],

  daily:[

    "Keyboard",
    "Barcode",
    "Camera",
    "LED Lights",
    "Microwave",
    "Elevator",
    "Printer"

  ]

} as const;



type Category =
keyof typeof SUBJECTS;



const TITLE_PATTERNS = [

  "The Hidden Story Behind {x}",
  "How {x} Changed The World",
  "Why Was {x} Invented?",
  "How Does {x} Really Work?",
  "The Forgotten History Of {x}",
  "The Technology Secret Of {x}",
  "The Surprising Truth About {x}",
  "Nobody Explains {x} Like This"

] as const;




const ANGLES = [

  "history",
  "engineering",
  "unknown facts",
  "future technology",
  "how it works",
  "origin story",
  "hidden details"

] as const;






function random<T>(array:readonly T[]):T {


  const value =
    array[
      Math.floor(
        Math.random()*array.length
      )
    ];


  if(value===undefined){

    throw new Error(
      "Empty array"
    );

  }


  return value;

}







export async function generateUniqueTopic(){


  let attempts=0;



  while(attempts<500){


    const category =
      random(
        Object.keys(SUBJECTS) as Category[]
      );



    const subjects =
      SUBJECTS[category];



    const subject =
      random(subjects);



    const pattern =
      random(TITLE_PATTERNS);



    const title =
      pattern.replace(
        "{x}",
        subject
      );



    const angle =
      random(ANGLES);



    if(
      await hasVideo(title)
    ){

      attempts++;

      continue;

    }




    await addVideo({

      title,

      topic:subject,

      hook:
      `The hidden truth behind ${subject}`,

      angle,

      createdAt:
      new Date().toISOString()

    });





    return {

      topic:title,

      baseTopic:subject,

      category,

      angle,

      searchQueries:[

        subject,

        `${subject} technology`,

        "documentary",

        "cinematic technology"

      ]

    };


  }



  throw new Error(
    "Unique topic generation failed"
  );


}








export async function generateTopics(
count:number
){

  const result = [];



  for(
    let i=0;
    i<count;
    i++
  ){

    result.push(
      await generateUniqueTopic()
    );

  }



  return result;

}
