import { GoogleGenAI } from '@google/genai';

import {
  blueprintSchema,
  topicPlanSchema,
  type Blueprint,
  type ResearchResult,
  type TopicPlan,
} from '../domain/blueprint.js';

import { LocalAIService } from './local-ai.service.js';



interface ErrorLike {

  status?: number | string;

  code?: number | string;

  message?: string;

}




function getError(
  error: unknown
): ErrorLike {


  if (
    typeof error !== "object" ||
    error === null
  ) {

    return {};

  }


  const e =
    error as Record<string, unknown>;


  const result: ErrorLike = {};



  if (
    typeof e.status === "number" ||
    typeof e.status === "string"
  ) {

    result.status = e.status;

  }



  if (
    typeof e.code === "number" ||
    typeof e.code === "string"
  ) {

    result.code = e.code;

  }



  if (
    typeof e.message === "string"
  ) {

    result.message = e.message;

  }


  return result;

}





function isQuotaError(
  error: unknown
): boolean {


  const e =
    getError(error);


  const message =
    e.message?.toLowerCase() ?? "";



  return (

    message.includes("quota") ||
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    e.status === 429

  );


}









export class GeminiService {


  readonly #client?: GoogleGenAI;

  readonly #model:string;

  readonly #localAI:LocalAIService;





  constructor(
    apiKey:string,
    model:string
  ){


    this.#model = model;


    this.#localAI =
      new LocalAIService();



    if(apiKey.trim()){


      this.#client =
        new GoogleGenAI({

          apiKey

        });


    }


  }









  public async planTopics(

    niche:string,

    language:string,

    count:number

  ):Promise<readonly TopicPlan[]> {



    if(!this.#client){

      return this.localTopics(count);

    }





    try {


      const response =
        await this.#client.models.generateContent({

          model:this.#model,


          contents:
`
Sen bir YouTube Shorts içerik uzmanısın.

${count} adet benzersiz video konusu oluştur.


Kanal konusu:

${niche}


Dil:

${language}


Kurallar:

- Konular Türkçe olmalı.
- İlginç ve merak uyandırıcı olmalı.
- 40-55 saniyelik Shorts formatına uygun olmalı.
- Bilim, teknoloji, tarih ve günlük hayat bağlantılı olmalı.
- Aynı konu tekrar edilmemeli.


Sadece JSON döndür:


{
 "topics":[
  {
   "topic":"",
   "angle":""
  }
 ]
}

`

        });




      const text =
        response.text?.trim();



      if(!text){

        throw new Error(
          "Empty response"
        );

      }



      return topicPlanSchema.parse(

        JSON.parse(text)

      ).topics;




    }

    catch(error){


      console.log(

        isQuotaError(error)

        ?

        "[Gemini quota] Local topics"

        :

        "[Gemini failed] Local topics"

      );



      return this.localTopics(count);


    }



  }













  public async researchTopic(

    niche:string,

    _language:string,

    requestedTopic:string,

    angle?:string

  ):Promise<ResearchResult>{



    if(this.#client){



      try {


        const response =
          await this.#client.models.generateContent({

            model:this.#model,


            contents:
`
Türkçe YouTube Shorts araştırması yap.


Konu:

${requestedTopic}


Kategori:

${niche}


Açı:

${angle ?? ""}



Şunları ver:

- önemli gerçekler
- kısa tarih
- neden önemli olduğu
- görsel fikirleri


Kurallar:

- uydurma bilgi verme.
- kesin olmayan bilgileri yazma.
- Türkçe yaz.

`

          });




        const text =
          response.text?.trim();




        if(text){


          return {

            text,

            sources:[]

          };


        }



      }

      catch{


        console.log(

          "[Gemini research fallback]"

        );


      }



    }





    return this.#localAI.generateResearch(

      requestedTopic

    );


  }













  public async createBlueprint(

    research:ResearchResult,

    niche:string,

    language:string

  ):Promise<Blueprint>{





    if(this.#client){



      try {



        const response =
          await this.#client.models.generateContent({


            model:this.#model,



            contents:
`
Türkçe YouTube Shorts senaryosu oluştur.


Kanal:

${niche}


Dil:

${language}



Kurallar:


- Kesinlikle Türkçe yaz.
- İngilizce cümle kullanma.
- 5 sahne oluştur.
- Video süresi 45-55 saniye olacak.
- İlk sahne güçlü merak uyandırmalı.
- Her sahnede anlatım metni olmalı.
- Her sahnede 2 adet İngilizce Pexels araması üret.



JSON formatı:


{
"topic":"",
"title":"",
"description":"",
"hook":"",
"scenes":[

{
"narration":"",
"searchQueries":[
"",
""
]
}

]

}



Araştırma:

${research.text}


`

          });





        const text =
          response.text?.trim();




        if(text){


          return blueprintSchema.parse(

            JSON.parse(text)

          );


        }





      }

      catch{


        console.log(

          "[Gemini blueprint fallback]"

        );


      }



    }





    const topic =

      research.text

      .split("\n")

      .find(

        line =>

        line.toLowerCase()

        .startsWith("topic")

      )

      ?.replace(

        /topic:/i,

        ""

      )

      .trim()

      ??

      "Teknoloji Hikayesi";





    return this.#localAI.generateBlueprint(

      topic

    );



  }









  private localTopics(

    count:number

  ):TopicPlan[]{



    const topics = [


      "WiFi Nasıl İcat Edildi?",

      "QR Kodların Gizli Hikayesi",

      "GPS Konumumuzu Nasıl Buluyor?",

      "Bluetooth İsmi Nereden Geliyor?",

      "QWERTY Klavye Neden Böyle?",

      "İlk İnternet Mesajı",

      "Elektrikli Arabaların Tarihi",

      "Yapay Zekanın Başlangıcı"



    ];





    return Array.from(

      {length:count},


      (_,index)=>({


        topic:

        topics[index % topics.length] ?? "Teknoloji Hikayesi",



        angle:

        "Bu teknolojinin bilinmeyen hikayesi"



      })


    );



  }



}
