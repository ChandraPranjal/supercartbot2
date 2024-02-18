
//   const supabaseUrl = process.env.SUPABASE_URL;
//   const supabaseKey = process.env.SUPABASE_KEY;

//   const client = createClient(supabaseUrl, supabaseKey);

//   const vectorStore = await SupabaseVectorStore.fromDocuments(
//     docOutput,
//     new OpenAIEmbeddings(process.env.OPENAI_API_KEY),{
//         client,
//         tableName:'documents',

//     });

// console.log(vectorStore);
// } catch (error) {
//     console.log(error);
// }
