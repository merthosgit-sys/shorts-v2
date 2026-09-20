export interface TopicItem {

topic:string;

hook:string;

facts:string[];

visuals:string[];

}



export const TOPIC_LIBRARY:TopicItem[] = [


{
topic:"How WiFi Was Invented",

hook:
"WiFi was not created for smartphones. Its origin is surprising.",

facts:[

"WiFi started from research into wireless communication.",

"Engineers developed standards that allowed devices to connect without cables.",

"Today billions of devices use WiFi every day."

],

visuals:[

"wifi router close up",

"wireless signal animation",

"computer network"

]

},



{
topic:"The Hidden Story Of QR Codes",

hook:
"Those black squares contain more technology than you think.",

facts:[

"QR codes were created for tracking automotive parts.",

"They can store much more information than traditional barcodes.",

"Today they are used worldwide for payments and information."

],

visuals:[

"QR code scanning",

"barcode technology",

"smartphone scanning"

]

}



];
