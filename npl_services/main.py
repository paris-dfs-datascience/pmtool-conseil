from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
from typing import List, Optional
import torch
import logging
import os
import warnings
import numpy as np

# Suppress specific warnings
warnings.filterwarnings("ignore", message=".*resume_download.*")
warnings.filterwarnings("ignore", message=".*xla_device.*")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="NLP Services API",
    description="Ultra memory-optimized NLP analysis API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class TextInput(BaseModel):
    text: str
    
class ClassificationInput(BaseModel):
    text: str
    labels: List[str]
    
class BatchTextInput(BaseModel):
    texts: List[str]

class SentimentResponse(BaseModel):
    text: str
    label: str
    confidence: float
    
class ClassificationResponse(BaseModel):
    text: str
    predictions: List[dict]
    
class EntityResponse(BaseModel):
    text: str
    entities: List[dict]

class ComprehensiveResponse(BaseModel):
    text: str
    sentiment: dict
    emotion: dict
    entities: List[dict]
    text_length: int
    word_count: int

# Helper function to convert numpy types
def to_python_float(value):
    """Convert numpy float to Python float"""
    if isinstance(value, np.floating):
        return float(value)
    return float(value)

# Initialize models - ULTRA SMALL models for 4GB memory
class NLPModels:
    def __init__(self):
        self._sentiment_analyzer = None
        self._classifier = None
        self._ner = None
        self._emotion_analyzer = None
        self._summarizer = None
        self.models_loaded = False
        
    def load_models(self):
        """Lazy load ULTRA SMALL models when first requested"""
        if self.models_loaded:
            return
            
        try:
            logger.info("Loading RELIABLE NLP models for 4GB memory...")
            
            # RELIABLE Sentiment Analysis - ~268MB 
            self._sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                truncation=True,
                max_length=512
            )
            
            # RELIABLE Zero-shot classification - ~268MB
            self._classifier = pipeline(
                "zero-shot-classification", 
                model="typeform/distilbert-base-uncased-mnli",
                truncation=True,
                max_length=512
            )
            
            # RELIABLE Named Entity Recognition - ~438MB
            # Note: NER pipeline doesn't accept truncation in initialization
            self._ner = pipeline(
                "ner",
                model="dbmdz/bert-base-cased-finetuned-conll03-english",
                aggregation_strategy="simple"
            )
            
            # RELIABLE Emotion detection - ~268MB
            self._emotion_analyzer = pipeline(
                "text-classification",
                model="j-hartmann/emotion-english-distilroberta-base",
                truncation=True,
                max_length=512
            )
            
            # RELIABLE Text summarization - ~324MB
            self._summarizer = pipeline(
                "summarization",
                model="sshleifer/distilbart-cnn-6-6",
                truncation=True,
                max_length=1024  # Summarization models often support longer sequences
            )
            
            self.models_loaded = True
            logger.info("All RELIABLE models loaded successfully!")
            logger.info("Total memory usage: ~1.5GB for all models")
            
        except Exception as e:
            logger.error(f"Failed to load NLP models: {e}")
            raise HTTPException(status_code=500, detail=f"Model loading failed: {str(e)}")
    
    @property
    def sentiment_analyzer(self):
        if not self.models_loaded:
            self.load_models()
        return self._sentiment_analyzer
    
    @property
    def classifier(self):
        if not self.models_loaded:
            self.load_models()
        return self._classifier
    
    @property
    def ner(self):
        if not self.models_loaded:
            self.load_models()
        return self._ner
    
    @property
    def emotion_analyzer(self):
        if not self.models_loaded:
            self.load_models()
        return self._emotion_analyzer
    
    @property
    def summarizer(self):
        if not self.models_loaded:
            self.load_models()
        return self._summarizer

# Global models instance
models = NLPModels()

def safe_chunk_text(text: str, max_words: int = 100) -> List[str]:
    """
    Safely chunk text into smaller pieces, being conservative about size.
    Uses a smaller word count to account for tokenization expansion.
    """
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), max_words):
        chunk = " ".join(words[i:i + max_words])
        # Additional safety: truncate to max characters to prevent extreme token expansion
        if len(chunk) > 400:  # ~400 chars should be well under 512 tokens
            chunk = chunk[:400]
        chunks.append(chunk)
    
    return chunks

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "NLP Services API is running",
        "version": "1.0.0",
        "docs": "/docs",
        "optimization": "Reliable models for 4GB Cloud Run"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for NLP service"""
    return {
        "status": "healthy", 
        "models_loaded": models.models_loaded,
        "service": "NLP Analyzer",
        "optimization": "Reliable models ~1.5GB total",
        "models": {
            "sentiment": "distilbert-base-uncased-finetuned-sst-2-english",
            "classification": "typeform/distilbert-base-uncased-mnli", 
            "ner": "dbmdz/bert-base-cased-finetuned-conll03-english",
            "emotion": "j-hartmann/emotion-english-distilroberta-base",
            "summarization": "sshleifer/distilbart-cnn-6-6"
        }
    }

@app.post("/analyze/sentiment", response_model=SentimentResponse)
async def analyze_sentiment(input_data: TextInput):
    """
    Analyze sentiment of text using chunking for long texts
    """
    try:
        text = input_data.text
        chunks = safe_chunk_text(text, max_words=100)
        
        # If single chunk, analyze directly
        if len(chunks) == 1:
            result = models.sentiment_analyzer(chunks[0])[0]
            return SentimentResponse(
                text=text,
                label=result["label"],
                confidence=round(to_python_float(result["score"]), 4)
            )
        
        # For multiple chunks, analyze each
        sentiments = []
        for chunk in chunks:
            try:
                result = models.sentiment_analyzer(chunk)[0]
                sentiments.append(result)
            except Exception as e:
                logger.warning(f"Failed to analyze chunk: {e}")
                continue
        
        if not sentiments:
            raise HTTPException(status_code=500, detail="No chunks could be analyzed")
        
        # Aggregate results
        sentiment_scores = {}
        for sent in sentiments:
            label = sent["label"]
            score = to_python_float(sent["score"])
            if label not in sentiment_scores:
                sentiment_scores[label] = []
            sentiment_scores[label].append(score)
        
        # Find dominant sentiment
        avg_scores = {label: sum(scores)/len(scores) for label, scores in sentiment_scores.items()}
        dominant = max(avg_scores.items(), key=lambda x: x[1])
        
        return SentimentResponse(
            text=text,
            label=dominant[0],
            confidence=round(dominant[1], 4)
        )
    except Exception as e:
        logger.error(f"Sentiment analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sentiment analysis failed: {str(e)}")

@app.post("/analyze/emotion")
async def analyze_emotion(input_data: TextInput):
    """
    Detect emotions in text using chunking for long texts
    """
    try:
        text = input_data.text
        chunks = safe_chunk_text(text, max_words=100)
        
        # If single chunk, analyze directly
        if len(chunks) == 1:
            result = models.emotion_analyzer(chunks[0])[0]
            return {
                "text": text,
                "emotion": result["label"],
                "confidence": round(to_python_float(result["score"]), 4)
            }
        
        # For multiple chunks, analyze each
        emotions = []
        for chunk in chunks:
            try:
                result = models.emotion_analyzer(chunk)[0]
                emotions.append(result)
            except Exception as e:
                logger.warning(f"Failed to analyze chunk: {e}")
                continue
        
        if not emotions:
            raise HTTPException(status_code=500, detail="No chunks could be analyzed")
        
        # Aggregate results
        emotion_scores = {}
        for emo in emotions:
            label = emo["label"]
            score = to_python_float(emo["score"])
            if label not in emotion_scores:
                emotion_scores[label] = []
            emotion_scores[label].append(score)
        
        # Find dominant emotion
        avg_scores = {label: sum(scores)/len(scores) for label, scores in emotion_scores.items()}
        dominant = max(avg_scores.items(), key=lambda x: x[1])
        
        return {
            "text": text,
            "emotion": dominant[0],
            "confidence": round(dominant[1], 4)
        }
    except Exception as e:
        logger.error(f"Emotion analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Emotion analysis failed: {str(e)}")

@app.post("/analyze/classify", response_model=ClassificationResponse)
async def classify_text(input_data: ClassificationInput):
    """
    Zero-shot text classification using compact DeBERTa model
    """
    try:
        # For classification, we'll use the first 400 chars to ensure it fits
        text = input_data.text[:400] if len(input_data.text) > 400 else input_data.text
        
        result = models.classifier(text, input_data.labels)
        
        predictions = []
        for label, score in zip(result["labels"], result["scores"]):
            predictions.append({
                "label": label,
                "confidence": round(to_python_float(score), 4)
            })
        
        return ClassificationResponse(
            text=input_data.text,
            predictions=predictions
        )
    except Exception as e:
        logger.error(f"Classification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

@app.post("/analyze/entities", response_model=EntityResponse)
async def extract_entities(input_data: TextInput):
    """
    Named Entity Recognition using chunking for long texts
    """
    try:
        text = input_data.text
        chunks = safe_chunk_text(text, max_words=100)
        
        all_entities = []
        for chunk in chunks:
            try:
                # Truncate chunk to ensure it fits within model limits
                if len(chunk) > 400:
                    chunk = chunk[:400]
                chunk_entities = models.ner(chunk)
                all_entities.extend(chunk_entities)
            except Exception as e:
                logger.warning(f"Failed to analyze chunk for entities: {e}")
                continue
        
        # Deduplicate entities by text and label, keeping highest confidence
        entity_map = {}
        for entity in all_entities:
            key = f"{entity['word']}-{entity['entity_group']}"
            if key not in entity_map or entity['score'] > entity_map[key]['score']:
                entity_map[key] = entity
        
        processed_entities = []
        for entity in entity_map.values():
            processed_entities.append({
                "text": entity["word"],
                "label": entity["entity_group"],
                "confidence": round(to_python_float(entity["score"]), 4),
                "start": entity.get("start", 0),
                "end": entity.get("end", 0)
            })
        
        return EntityResponse(
            text=text,
            entities=processed_entities
        )
    except Exception as e:
        logger.error(f"NER error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Entity extraction failed: {str(e)}")

@app.post("/analyze/summarize")
async def summarize_text(input_data: TextInput):
    """
    Text summarization using compact model
    """
    try:
        # Only summarize if text is long enough
        if len(input_data.text.split()) < 30:
            return {
                "text": input_data.text,
                "summary": "Text too short for summarization",
                "length_reduction": 0
            }
        
        # Truncate input if too long for model (conservative limit)
        words = input_data.text.split()
        if len(words) > 400:
            truncated_text = " ".join(words[:400])
        else:
            truncated_text = input_data.text
            
        result = models.summarizer(
            truncated_text,
            max_length=100,
            min_length=20,
            do_sample=False
        )[0]
        
        original_length = len(input_data.text.split())
        summary_length = len(result["summary_text"].split())
        reduction = round((1 - summary_length/original_length) * 100, 1)
        
        return {
            "text": input_data.text,
            "summary": result["summary_text"],
            "length_reduction": f"{reduction}%"
        }
    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

@app.post("/analyze/batch-sentiment")
async def batch_sentiment_analysis(input_data: BatchTextInput):
    """
    Analyze sentiment for multiple texts at once
    """
    try:
        results = []
        for text in input_data.texts:
            # Use safe chunking for each text
            chunks = safe_chunk_text(text, max_words=100)
            if len(chunks) == 1:
                result = models.sentiment_analyzer(chunks[0])[0]
                results.append({
                    "text": text,
                    "label": result["label"],
                    "confidence": round(to_python_float(result["score"]), 4)
                })
            else:
                # For multi-chunk texts, use the sentiment analysis logic
                sentiments = []
                for chunk in chunks:
                    try:
                        result = models.sentiment_analyzer(chunk)[0]
                        sentiments.append(result)
                    except:
                        continue
                
                if sentiments:
                    # Aggregate
                    sentiment_scores = {}
                    for sent in sentiments:
                        label = sent["label"]
                        score = to_python_float(sent["score"])
                        if label not in sentiment_scores:
                            sentiment_scores[label] = []
                        sentiment_scores[label].append(score)
                    
                    avg_scores = {label: sum(scores)/len(scores) for label, scores in sentiment_scores.items()}
                    dominant = max(avg_scores.items(), key=lambda x: x[1])
                    
                    results.append({
                        "text": text,
                        "label": dominant[0],
                        "confidence": round(dominant[1], 4)
                    })
        
        return {"results": results}
    except Exception as e:
        logger.error(f"Batch sentiment analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch analysis failed: {str(e)}")

@app.post("/analyze/comprehensive", response_model=ComprehensiveResponse)
async def comprehensive_analysis(input_data: TextInput):
    """
    Run multiple analyses on the same text using compact models with chunking
    """
    try:
        text = input_data.text
        word_count = len(text.split())
        
        # Reject extremely large texts
        if word_count > 10000:
            raise HTTPException(
                status_code=413, 
                detail=f"Text too large: {word_count} words. Maximum 10,000 words allowed."
            )
        
        # Use the safe chunking function with conservative size
        chunks = safe_chunk_text(text, max_words=100)
        
        logger.info(f"Processing {len(chunks)} chunks for comprehensive analysis (total words: {word_count})")
        
        # Analyze each chunk
        all_sentiments = []
        all_emotions = []
        all_entities = []
        
        # Process maximum 100 chunks to prevent timeout
        max_chunks = min(len(chunks), 100)
        if max_chunks < len(chunks):
            logger.warning(f"Processing only first {max_chunks} chunks out of {len(chunks)} total")
        
        for i, chunk in enumerate(chunks[:max_chunks]):
            if i % 10 == 0:
                logger.info(f"Processing chunk {i}/{max_chunks}")
            try:
                # Sentiment analysis on chunk
                sentiment = models.sentiment_analyzer(chunk)[0]
                all_sentiments.append(sentiment)
                
                # Emotion analysis on chunk
                emotion = models.emotion_analyzer(chunk)[0]
                all_emotions.append(emotion)
                
                # NER on chunk - with extra safety truncation
                if len(chunk) > 400:
                    chunk = chunk[:400]
                entities = models.ner(chunk)
                all_entities.extend(entities)
            except Exception as e:
                logger.warning(f"Failed to analyze chunk {i}: {e}")
                continue
        
        if not all_sentiments or not all_emotions:
            raise HTTPException(status_code=500, detail="Failed to analyze text chunks")
        
        # Aggregate sentiment results
        sentiment_scores = {}
        for sent in all_sentiments:
            label = sent["label"]
            score = to_python_float(sent["score"])
            if label not in sentiment_scores:
                sentiment_scores[label] = []
            sentiment_scores[label].append(score)
        
        # Find dominant sentiment
        avg_sentiment_scores = {label: sum(scores)/len(scores) for label, scores in sentiment_scores.items()}
        dominant_sentiment = max(avg_sentiment_scores.items(), key=lambda x: x[1])
        
        # Aggregate emotion results
        emotion_scores = {}
        for emo in all_emotions:
            label = emo["label"]
            score = to_python_float(emo["score"])
            if label not in emotion_scores:
                emotion_scores[label] = []
            emotion_scores[label].append(score)
        
        # Find dominant emotion
        avg_emotion_scores = {label: sum(scores)/len(scores) for label, scores in emotion_scores.items()}
        dominant_emotion = max(avg_emotion_scores.items(), key=lambda x: x[1])
        
        # Deduplicate and process entities
        entity_map = {}
        for entity in all_entities:
            key = f"{entity['word']}-{entity['entity_group']}"
            if key not in entity_map or entity['score'] > entity_map[key]['score']:
                entity_map[key] = entity
        
        processed_entities = []
        for entity in entity_map.values():
            processed_entities.append({
                "text": entity["word"],
                "label": entity["entity_group"],
                "confidence": round(to_python_float(entity["score"]), 4)
            })
        
        return ComprehensiveResponse(
            text=text[:200] + "..." if len(text) > 200 else text,  # Preview of text
            sentiment={
                "label": dominant_sentiment[0],
                "confidence": round(dominant_sentiment[1], 4)
            },
            emotion={
                "label": dominant_emotion[0],
                "confidence": round(dominant_emotion[1], 4)
            },
            entities=processed_entities,
            text_length=len(text),
            word_count=len(text.split())
        )
    except Exception as e:
        logger.error(f"Comprehensive analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Comprehensive analysis failed: {str(e)}")

# Preload models on import if environment variable is set
if os.getenv("PRELOAD_NLP_MODELS", "false").lower() == "true":
    try:
        models.load_models()
        logger.info("NLP models preloaded on startup")
    except Exception as e:
        logger.warning(f"Failed to preload NLP models: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)