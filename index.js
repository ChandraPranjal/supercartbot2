import "dotenv/config";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { FunctionsRelayError, createClient } from "@supabase/supabase-js";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";

try {
  const formatConvHistory = (messages) => {
    return messages
      .map((message, i) => {
        if (i % 2 === 0) return `Human: ${message}`;
        else return `AI: ${message}`;
      })
      .join("\n");
  };

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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const embeddings = new OpenAIEmbeddings(process.env.OPENAI_API_KEY);
  const client = createClient(supabaseUrl, supabaseKey);

  const vectorStore = new SupabaseVectorStore(embeddings, {
    client,
    tableName: "documents",
    queryName: "match_documents",
  });

  const retriver = vectorStore.asRetriever();
  const llm = new ChatOpenAI(process.env.OPENAI_API_KEY);
  const convHistory = [];

  const standaloneQuestionTemplate = `Given some conversation history (if any) and  a question, convert it to a standalone question . conversation history : {conv_history} question : {question} standalone question:`;
  const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
    standaloneQuestionTemplate
  );

  const answerTemplate = `You're a helpful and enthusastic bot that can do movie recommendation bot , answer based on the context provied and conversation history.If answer is not given in the context find the answer in the conversation history. If you don't know answer to question say I
 'm sorry.Always answer like you're chatting to a friend
 context:{context}
 question:{question}
 conversation history : {conv_history}
 answer:
 `;

  function combineDocuments(docs) {
    return docs.map((doc) => doc.pageContent).join("\n\n");
  }
  const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

  const standaloneQuestionChain = standaloneQuestionPrompt
    .pipe(llm)
    .pipe(new StringOutputParser());

  const retriverChain = RunnableSequence.from([
    (prevResult) => prevResult.standalone_question,
    retriver,
    combineDocuments,
  ]);

  const answerChain = answerPrompt.pipe(llm).pipe(new StringOutputParser());

  const chain = RunnableSequence.from([
    {
      standalone_question: standaloneQuestionChain,
      original_input: new RunnablePassthrough(),
    },
    {
      context: retriverChain,
      question: ({ original_input }) => original_input.question,
      conv_history: ({ original_input }) => original_input.conv_history,
    },
    answerChain,
  ]);

  //   console.log(standaloneQuestionChain);
  async function progressConversation(question) {
    const response = await chain.invoke({
      question: question,
      conv_history: formatConvHistory(convHistory),
    });
    convHistory.push(question);
    convHistory.push(response);
    console.log(convHistory);
    console.log(response);
  }
  progressConversation("Which movies are rated higher than 7?")
} catch (error) {
  console.log(error);
}

