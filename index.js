import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
const app = express();
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@supabase/supabase-js";

import { createRetrievalChain } from "langchain/chains/retrieval";

import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { JSONLoader } from "langchain/document_loaders/fs/json";

// import { MessagesPlaceholder } from "@langchain/core/prompts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.get("/test", (req, res) => {
  console.log("Workign backend");
  res.status(200).json("Health : OK");
});

const createModel = () => {
  try {
    const model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0.9,
      openAIApiKey: process.env.OPENAI_API_KEY, // In Node.js defaults to process.env.OPENAI_API_KEY
    });
    return model;
  } catch (error) {
    console.log("Error while Creating Model", error);
  }
};

const createTemplate = () => {
  try {
    const prompt = ChatPromptTemplate.fromMessages(
      [
        "system",
        `You're a friendly fashion recommendation bot. Answer to user's query based on Context  : {context}. You need to output name of items present in database as a list,If not found simply say ""Oops! We couldn't find any items matching your search right now. 😔"" .Always try to be friendly like you're talking to a friend`,
      ],
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"]
    );
    // const chat = prompt.pipe(model);
    // await prompt.format({ product: "colorful socks" });
    return prompt;
  } catch (error) {
    console.log("Error while creating Template", error);
  }
};

const createDocumnetsChain = async (model, prompt) => {
  try {
    const documentChainChat = await createStuffDocumentsChain({
      llm: model,
      prompt,
    });
    return documentChainChat;
  } catch (error) {
    console.log("Error while creatingDocumentsChain", error);
  }
};

const loadPdf = async () => {
  try {
    const loader = new JSONLoader(
      "/home/pc/Desktop/Begining/Resume Projects/Ecommerce Recommendations/product.json"
    );
    const docs = await loader.load();
    return docs;
  } catch (error) {
    console.log("Error while loading Pdf", error);
  }
};

const splitDocs = async (docs) => {
  try {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 700,
    });

    const docOutput = await splitter.splitDocuments(docs);
    return docOutput;
  } catch (error) {
    console.log("Error while splitting docs", error);
  }
};

const createEmbeddingsAndCreateVectors = async (docOutput) => {
  try {
    const privateKey = process.env.SUPABASE_PRIVATE_KEY;
    if (!privateKey) throw new Error(`Expected env var SUPABASE_PRIVATE_KEY`);

    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error(`Expected env var SUPABASE_URL`);

    const client = createClient(url, privateKey);

    const vectorStore = await SupabaseVectorStore.fromDocuments(
      docOutput,
      new OpenAIEmbeddings(),
      {
        client,
        tableName: "documents",
        queryName: "match_documents",
      }
    );

    // const resultOne = await vectorStore.similaritySearch(
    //   "Tell me stats about my favourite player?",
    //   5
    // );
    // console.log(resultOne);
    return vectorStore;
  } catch (error) {
    console.log("Error while creating Embeddings", error);
  }
};

const createRetrChain = async (model, vectorStore, documentChainChat) => {
  try {
    // const retrievalChain = await createRetrievalChain({
    //   retriever: vectorStore.asRetriever(),
    //   combineDocsChain: documentChainChat,
    // });

    const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"],
      [
        "user",
        "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation",
      ],
    ]);

    const historyAwareRetriever = await createHistoryAwareRetriever({
      llm: model,
      retriever: vectorStore.asRetriever(),
      rephrasePrompt: historyAwareRetrievalPrompt,
    });
    const HistoryAwareRetrievalChain = await createRetrievalChain({
      retriever: historyAwareRetriever,
      combineDocsChain: documentChainChat,
    });

    return HistoryAwareRetrievalChain;
  } catch (error) {
    console.log("Error while creating retreival Chain", error);
  }
};

const model = createModel();
const prompt = createTemplate();
const documentChainChat = await createDocumnetsChain(model, prompt);
const docs = await loadPdf();
const docOutput = await splitDocs(docs);
const vectorStore = await createEmbeddingsAndCreateVectors(docOutput);
console.log(vectorStore);
const retrievalChain = await createRetrChain(
  model,
  vectorStore,
  documentChainChat
);
const chatHistory = [
  new HumanMessage(""),
  // new AIMessage("LangChain Expression Language"),
];

// const response = await retrievalChain.invoke({
//   chat_history: chatHistory,
//   input: "What items do you have for this summer ? ",
// });
// console.log(response);


app.post("/recommendations", async (req, res) => {
  try {
    const query = req.body.query;
    const response = await retrievalChain.invoke({
      chat_history: chatHistory,
      input: query,
    });
    console.log(response);
    res.status(200).json(response.answer);
  } catch (error) {
    console.log(error);
    res.status(400).json("Free Quota limit exceeded");
  }
});

app.listen(3000, () => {
  console.log("Server booted");
});

// console.log(result);
// const response = await documentChainChat.invoke({
//   input: "Who won 4th test and when did it happen ?",
//   context: docOutput,
// });
// console.log(response);
