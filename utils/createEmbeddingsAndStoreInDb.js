async function createEmbeddingsAndStoreInDb() {
  const loader = new TextLoader(
    "/home/pc/Desktop/Begining/Ai/JS/chatwithpdf/movies_data.txt"
  );

  const docs = await loader.load();
  // console.log(docs[0].pageContent);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 0,
    separators: ["\n\n"],
  });

  const docOutput = await splitter.splitDocuments([
    new Document({ pageContent: docs[0].pageContent }),
  ]);

  console.log(docOutput);
  //////////////////////////////////////////////////////

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  const client = createClient(supabaseUrl, supabaseKey);

  const vectorStore = await SupabaseVectorStore.fromDocuments(
    docOutput,
    new OpenAIEmbeddings(process.env.OPENAI_API_KEY),
    {
      client,
      tableName: "documents",
    }
  );

  console.log(vectorStore);
}
