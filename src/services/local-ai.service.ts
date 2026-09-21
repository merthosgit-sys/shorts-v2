import {
  TOPIC_LIBRARY
} from "../data/topic-library.js";


import type {
  ResearchResult,
  Blueprint
} from "../domain/blueprint.js";





export class LocalAIService {





  public generateResearch(
    topic:string
  ):ResearchResult {


    const item =
      TOPIC_LIBRARY.find(
        (x)=>x.topic===topic
      );



    if(!item){


      return {

        text:
`
Topic:
${topic}


Main facts:

${topic}, teknoloji ve bilimin gelişiminde önemli bir yere sahip ilginç bir konudur.

Bu teknoloji zaman içinde gelişerek insanların günlük yaşamını değiştirmiştir.

`,

        sources:[]

      };


    }




    return {


      text:
`
Topic:
${item.topic}


Main facts:

${item.facts.join("\n")}

`,

      sources:[]

    };


  }












  public generateBlueprint(
    topic:string
  ):Blueprint {



    const item =
      TOPIC_LIBRARY.find(
        (x)=>x.topic===topic
      );




    const visuals:string[] =

      item?.visuals ??

      [

        "technology documentary",

        "innovation laboratory",

        "digital technology",

        "future technology"

      ];







    return {



      topic,



      title:

      `${topic} Hakkında Şaşırtıcı Gerçekler`,




      description:

      `${topic} teknolojisinin bilinmeyen hikayesini anlatan kısa belgesel tarzı video.`,





      hook:

      item?.hook ??

      `${topic} her gün kullandığımız ama hikayesini çoğu kişinin bilmediği bir teknoloji.`,





      scenes:[




        {

          narration:

          `${topic} sandığımızdan çok daha ilginç bir hikayeye sahip. Her gün kullandığımız bu teknoloji aslında yıllar süren çalışmaların sonucu ortaya çıktı.`,


          searchQueries:[

            visuals[0] ?? "technology",

            visuals[1] ?? "innovation"

          ]

        },







        {

          narration:

          `İlk başta çözülmesi gereken birçok problem vardı. Bilim insanları ve mühendisler farklı yöntemler deneyerek bu teknolojiyi geliştirdi.`,


          searchQueries:[

            visuals[2] ?? "engineering",

            "technology laboratory"

          ]

        },







        {

          narration:

          `Zaman içinde yapılan geliştirmeler sayesinde bu teknoloji daha hızlı ve daha kullanışlı hale geldi. Bugün milyonlarca insan farkında olmadan bunu kullanıyor.`,


          searchQueries:[

            "people using technology",

            "modern digital life"

          ]

        },







        {

          narration:

          `Günümüzde araştırmalar devam ediyor. Yeni nesil sistemlerle bu teknolojinin gelecekte daha da gelişmesi bekleniyor.`,


          searchQueries:[

            "future technology",

            "scientific innovation"

          ]

        },







        {

          narration:

          `${topic} bize küçük fikirlerin büyük değişimlere dönüşebileceğini gösteriyor. Bilim ve insan zekası dünyayı değiştirmeye devam ediyor.`,


          searchQueries:[

            "world technology",

            "future innovation"

          ]

        }




      ]





    };



  }







}
