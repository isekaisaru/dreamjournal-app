SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: active_storage_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_storage_attachments (
    id bigint NOT NULL,
    name character varying NOT NULL,
    record_type character varying NOT NULL,
    record_id bigint NOT NULL,
    blob_id bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL
);


--
-- Name: active_storage_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.active_storage_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: active_storage_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.active_storage_attachments_id_seq OWNED BY public.active_storage_attachments.id;


--
-- Name: active_storage_blobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_storage_blobs (
    id bigint NOT NULL,
    key character varying NOT NULL,
    filename character varying NOT NULL,
    content_type character varying,
    metadata text,
    service_name character varying NOT NULL,
    byte_size bigint NOT NULL,
    checksum character varying,
    created_at timestamp(6) without time zone NOT NULL
);


--
-- Name: active_storage_blobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.active_storage_blobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: active_storage_blobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.active_storage_blobs_id_seq OWNED BY public.active_storage_blobs.id;


--
-- Name: active_storage_variant_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_storage_variant_records (
    id bigint NOT NULL,
    blob_id bigint NOT NULL,
    variation_digest character varying NOT NULL
);


--
-- Name: active_storage_variant_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.active_storage_variant_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: active_storage_variant_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.active_storage_variant_records_id_seq OWNED BY public.active_storage_variant_records.id;


--
-- Name: ai_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage_logs (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    feature character varying NOT NULL,
    created_at timestamp(6) without time zone NOT NULL
);


--
-- Name: ai_usage_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_usage_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_usage_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_usage_logs_id_seq OWNED BY public.ai_usage_logs.id;


--
-- Name: ar_internal_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ar_internal_metadata (
    key character varying NOT NULL,
    value character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: checkout_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkout_attempts (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    plan character varying NOT NULL,
    price_reference character varying NOT NULL,
    idempotency_key character varying NOT NULL,
    customer_idempotency_key character varying NOT NULL,
    stripe_customer_id character varying,
    stripe_checkout_session_id character varying,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    expires_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT checkout_attempts_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('open'::character varying)::text, ('uncertain'::character varying)::text, ('completed'::character varying)::text, ('expired'::character varying)::text, ('failed'::character varying)::text])))
);


--
-- Name: checkout_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checkout_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checkout_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checkout_attempts_id_seq OWNED BY public.checkout_attempts.id;


--
-- Name: dream_emotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dream_emotions (
    id bigint NOT NULL,
    dream_id bigint NOT NULL,
    emotion_id bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: dream_emotions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dream_emotions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dream_emotions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dream_emotions_id_seq OWNED BY public.dream_emotions.id;


--
-- Name: dream_image_generations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dream_image_generations (
    id bigint NOT NULL,
    dream_id bigint NOT NULL,
    user_id bigint NOT NULL,
    generated_at timestamp(6) without time zone NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: dream_image_generations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dream_image_generations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dream_image_generations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dream_image_generations_id_seq OWNED BY public.dream_image_generations.id;


--
-- Name: dream_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dream_profiles (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    name character varying NOT NULL,
    avatar_emoji character varying DEFAULT '😴'::character varying NOT NULL,
    color character varying DEFAULT '#6366f1'::character varying NOT NULL,
    relationship character varying DEFAULT 'self'::character varying NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: dream_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dream_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dream_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dream_profiles_id_seq OWNED BY public.dream_profiles.id;


--
-- Name: dreams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dreams (
    id bigint NOT NULL,
    title character varying,
    description text,
    user_id bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    content text,
    analysis_status character varying,
    analysis_json jsonb,
    analyzed_at timestamp(6) without time zone,
    generated_image_url text,
    image_generated_at timestamp(6) without time zone,
    dream_profile_id bigint NOT NULL
);


--
-- Name: dreams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dreams_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dreams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dreams_id_seq OWNED BY public.dreams.id;


--
-- Name: emotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emotions (
    id bigint NOT NULL,
    name character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: emotions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.emotions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: emotions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.emotions_id_seq OWNED BY public.emotions.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    stripe_checkout_session_id character varying NOT NULL,
    amount integer NOT NULL,
    status character varying NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    stripe_payment_intent_id character varying,
    currency character varying(3) NOT NULL
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: processed_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_webhook_events (
    id bigint NOT NULL,
    stripe_event_id character varying NOT NULL,
    processed_at timestamp(6) without time zone NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: processed_webhook_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processed_webhook_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processed_webhook_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processed_webhook_events_id_seq OWNED BY public.processed_webhook_events.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    stripe_subscription_id character varying NOT NULL,
    stripe_customer_id character varying NOT NULL,
    status character varying NOT NULL,
    current_period_end timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    refresh_token_digest character varying NOT NULL,
    expires_at timestamp(6) without time zone NOT NULL,
    revoked_at timestamp(6) without time zone,
    user_agent character varying,
    ip_address character varying,
    last_used_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying,
    email character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    password_digest character varying,
    username character varying,
    trial_user boolean,
    refresh_token character varying,
    reset_password_sent_at timestamp(6) without time zone,
    stripe_customer_id character varying,
    trial_analysis_count integer DEFAULT 0 NOT NULL,
    trial_audio_count integer DEFAULT 0 NOT NULL,
    premium boolean DEFAULT false NOT NULL,
    age_group character varying DEFAULT 'child'::character varying NOT NULL,
    analysis_tone character varying DEFAULT 'auto'::character varying NOT NULL,
    monthly_analysis_count integer DEFAULT 0 NOT NULL,
    monthly_analysis_count_reset_at timestamp(6) without time zone,
    email_verified_at timestamp(6) without time zone,
    email_verification_token_digest character varying,
    email_verification_sent_at timestamp(6) without time zone,
    reset_password_token_digest character varying,
    stripe_customer_idempotency_key character varying
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: active_storage_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_attachments ALTER COLUMN id SET DEFAULT nextval('public.active_storage_attachments_id_seq'::regclass);


--
-- Name: active_storage_blobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_blobs ALTER COLUMN id SET DEFAULT nextval('public.active_storage_blobs_id_seq'::regclass);


--
-- Name: active_storage_variant_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_variant_records ALTER COLUMN id SET DEFAULT nextval('public.active_storage_variant_records_id_seq'::regclass);


--
-- Name: ai_usage_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs ALTER COLUMN id SET DEFAULT nextval('public.ai_usage_logs_id_seq'::regclass);


--
-- Name: checkout_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_attempts ALTER COLUMN id SET DEFAULT nextval('public.checkout_attempts_id_seq'::regclass);


--
-- Name: dream_emotions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dream_emotions ALTER COLUMN id SET DEFAULT nextval('public.dream_emotions_id_seq'::regclass);


--
-- Name: dream_image_generations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dream_image_generations ALTER COLUMN id SET DEFAULT nextval('public.dream_image_generations_id_seq'::regclass);


--
-- Name: dream_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dream_profiles ALTER COLUMN id SET DEFAULT nextval('public.dream_profiles_id_seq'::regclass);


--
-- Name: dreams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dreams ALTER COLUMN id SET DEFAULT nextval('public.dreams_id_seq'::regclass);


--
-- Name: emotions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotions ALTER COLUMN id SET DEFAULT nextval('public.emotions_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: processed_webhook_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_webhook_events ALTER COLUMN id SET DEFAULT nextval('public.processed_webhook_events_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: active_storage_attachments active_storage_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_attachments
    ADD CONSTRAINT active_storage_attachments_pkey PRIMARY KEY (id);


--
-- Name: active_storage_blobs active_storage_blobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_blobs
    ADD CONSTRAINT active_storage_blobs_pkey PRIMARY KEY (id);


--
-- Name: active_storage_variant_records active_storage_variant_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_variant_records
    ADD CONSTRAINT active_storage_variant_records_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_logs ai_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: ar_internal_metadata ar_internal_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_internal_metadata
    ADD CONSTRAINT ar_internal_metadata_pkey PRIMARY KEY (key);


--
-- Name: checkout_attempts checkout_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_attempts
    ADD CONSTRAINT checkout_attempts_pkey PRIMARY KEY (id);


--
-- Name: dream_emotions dream_emotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dream_emotions
    ADD CONSTRAINT dream_emotions_pkey PRIMARY KEY (id);


--
-- Name: dream_image_generations dream_image_generations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dream_image_generations
    ADD CONSTRAINT dream_image_generations_pkey PRIMARY KEY (id);


--
-- Name: dream_profiles dream_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dream_profiles
    ADD CONSTRAINT dream_profiles_pkey PRIMARY KEY (id);


--
-- Name: dreams dreams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dreams
    ADD CONSTRAINT dreams_pkey PRIMARY KEY (id);


--
-- Name: emotions emotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotions
    ADD CONSTRAINT emotions_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: processed_webhook_events processed_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_webhook_events
    ADD CONSTRAINT processed_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_dream_profiles_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dream_profiles_active ON public.dream_profiles USING btree (user_id) WHERE (active = true);


--
-- Name: idx_dream_profiles_unique_self; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dream_profiles_unique_self ON public.dream_profiles USING btree (user_id) WHERE ((relationship)::text = 'self'::text);


--
-- Name: idx_dream_profiles_user_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dream_profiles_user_position ON public.dream_profiles USING btree (user_id, "position");


--
-- Name: index_active_storage_attachments_on_blob_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_active_storage_attachments_on_blob_id ON public.active_storage_attachments USING btree (blob_id);


--
-- Name: index_active_storage_attachments_uniqueness; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_active_storage_attachments_uniqueness ON public.active_storage_attachments USING btree (record_type, record_id, name, blob_id);


--
-- Name: index_active_storage_blobs_on_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_active_storage_blobs_on_key ON public.active_storage_blobs USING btree (key);


--
-- Name: index_active_storage_variant_records_uniqueness; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_active_storage_variant_records_uniqueness ON public.active_storage_variant_records USING btree (blob_id, variation_digest);


--
-- Name: index_ai_usage_logs_on_user_feature_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ai_usage_logs_on_user_feature_created_at ON public.ai_usage_logs USING btree (user_id, feature, created_at);


--
-- Name: index_ai_usage_logs_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ai_usage_logs_on_user_id ON public.ai_usage_logs USING btree (user_id);


--
-- Name: index_checkout_attempts_on_active_user_and_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_checkout_attempts_on_active_user_and_plan ON public.checkout_attempts USING btree (user_id, plan) WHERE ((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('open'::character varying)::text, ('uncertain'::character varying)::text]));


--
-- Name: index_checkout_attempts_on_customer_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_checkout_attempts_on_customer_idempotency_key ON public.checkout_attempts USING btree (customer_idempotency_key);


--
-- Name: index_checkout_attempts_on_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_checkout_attempts_on_idempotency_key ON public.checkout_attempts USING btree (idempotency_key);


--
-- Name: index_checkout_attempts_on_stripe_checkout_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_checkout_attempts_on_stripe_checkout_session_id ON public.checkout_attempts USING btree (stripe_checkout_session_id);


--
-- Name: index_checkout_attempts_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_checkout_attempts_on_user_id ON public.checkout_attempts USING btree (user_id);


--
-- Name: index_dream_emotions_on_dream_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dream_emotions_on_dream_id ON public.dream_emotions USING btree (dream_id);


--
-- Name: index_dream_emotions_on_emotion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dream_emotions_on_emotion_id ON public.dream_emotions USING btree (emotion_id);


--
-- Name: index_dream_image_generations_on_dream_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dream_image_generations_on_dream_id ON public.dream_image_generations USING btree (dream_id);


--
-- Name: index_dream_image_generations_on_dream_id_and_generated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dream_image_generations_on_dream_id_and_generated_at ON public.dream_image_generations USING btree (dream_id, generated_at);


--
-- Name: index_dream_image_generations_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dream_image_generations_on_user_id ON public.dream_image_generations USING btree (user_id);


--
-- Name: index_dream_image_generations_on_user_id_and_generated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dream_image_generations_on_user_id_and_generated_at ON public.dream_image_generations USING btree (user_id, generated_at);


--
-- Name: index_dream_profiles_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dream_profiles_on_user_id ON public.dream_profiles USING btree (user_id);


--
-- Name: index_dreams_on_analysis_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dreams_on_analysis_status ON public.dreams USING btree (analysis_status);


--
-- Name: index_dreams_on_dream_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dreams_on_dream_profile_id ON public.dreams USING btree (dream_profile_id);


--
-- Name: index_dreams_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dreams_on_user_id ON public.dreams USING btree (user_id);


--
-- Name: index_dreams_on_user_id_and_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dreams_on_user_id_and_created_at ON public.dreams USING btree (user_id, created_at);


--
-- Name: index_dreams_on_user_id_and_image_generated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dreams_on_user_id_and_image_generated_at ON public.dreams USING btree (user_id, image_generated_at) WHERE (image_generated_at IS NOT NULL);


--
-- Name: index_dreams_on_user_id_and_updated_at_with_image; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dreams_on_user_id_and_updated_at_with_image ON public.dreams USING btree (user_id, updated_at) WHERE (generated_image_url IS NOT NULL);


--
-- Name: index_payments_on_stripe_checkout_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_payments_on_stripe_checkout_session_id ON public.payments USING btree (stripe_checkout_session_id);


--
-- Name: index_payments_on_stripe_payment_intent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_payments_on_stripe_payment_intent_id ON public.payments USING btree (stripe_payment_intent_id);


--
-- Name: index_payments_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_payments_on_user_id ON public.payments USING btree (user_id);


--
-- Name: index_payments_on_user_id_and_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_payments_on_user_id_and_created_at ON public.payments USING btree (user_id, created_at);


--
-- Name: index_processed_webhook_events_on_stripe_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_processed_webhook_events_on_stripe_event_id ON public.processed_webhook_events USING btree (stripe_event_id);


--
-- Name: index_subscriptions_on_stripe_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_subscriptions_on_stripe_customer_id ON public.subscriptions USING btree (stripe_customer_id);


--
-- Name: index_subscriptions_on_stripe_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_subscriptions_on_stripe_subscription_id ON public.subscriptions USING btree (stripe_subscription_id);


--
-- Name: index_subscriptions_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_subscriptions_on_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: index_user_sessions_on_refresh_token_digest; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_user_sessions_on_refresh_token_digest ON public.user_sessions USING btree (refresh_token_digest);


--
-- Name: index_user_sessions_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_user_sessions_on_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: index_users_on_email_verification_token_digest; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_email_verification_token_digest ON public.users USING btree (email_verification_token_digest);


--
-- Name: index_users_on_reset_password_token_digest; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_reset_password_token_digest ON public.users USING btree (reset_password_token_digest);


--
-- Name: index_users_on_stripe_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_stripe_customer_id ON public.users USING btree (stripe_customer_id);


--
-- Name: index_users_on_stripe_customer_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_stripe_customer_idempotency_key ON public.users USING btree (stripe_customer_idempotency_key);


--
-- Name: index_users_on_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_username ON public.users USING btree (username);


--
-- Name: payments fk_rails_081dc04a02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_rails_081dc04a02 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: checkout_attempts fk_rails_27096e8881; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_attempts
    ADD CONSTRAINT fk_rails_27096e8881 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: dream_image_generations fk_rails_326f4086e0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dream_image_generations
    ADD CONSTRAINT fk_rails_326f4086e0 FOREIGN KEY (dream_id) REFERENCES public.dreams(id);


--
-- Name: ai_usage_logs fk_rails_4e2472263a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT fk_rails_4e2472263a FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: dream_image_generations fk_rails_5680df7f8f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dream_image_generations
    ADD CONSTRAINT fk_rails_5680df7f8f FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: dream_emotions fk_rails_5f45bd4a20; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dream_emotions
    ADD CONSTRAINT fk_rails_5f45bd4a20 FOREIGN KEY (emotion_id) REFERENCES public.emotions(id);


--
-- Name: subscriptions fk_rails_933bdff476; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT fk_rails_933bdff476 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: active_storage_variant_records fk_rails_993965df05; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_variant_records
    ADD CONSTRAINT fk_rails_993965df05 FOREIGN KEY (blob_id) REFERENCES public.active_storage_blobs(id);


--
-- Name: user_sessions fk_rails_9fa262d742; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT fk_rails_9fa262d742 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: dreams fk_rails_a97c2f08a7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dreams
    ADD CONSTRAINT fk_rails_a97c2f08a7 FOREIGN KEY (dream_profile_id) REFERENCES public.dream_profiles(id);


--
-- Name: dream_profiles fk_rails_ab06c1b3f6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dream_profiles
    ADD CONSTRAINT fk_rails_ab06c1b3f6 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: dream_emotions fk_rails_bf37b64798; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dream_emotions
    ADD CONSTRAINT fk_rails_bf37b64798 FOREIGN KEY (dream_id) REFERENCES public.dreams(id);


--
-- Name: active_storage_attachments fk_rails_c3b3935057; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_attachments
    ADD CONSTRAINT fk_rails_c3b3935057 FOREIGN KEY (blob_id) REFERENCES public.active_storage_blobs(id);


--
-- Name: dreams fk_rails_eb1c3292a0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dreams
    ADD CONSTRAINT fk_rails_eb1c3292a0 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ai_usage_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: checkout_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checkout_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: dream_image_generations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dream_image_generations ENABLE ROW LEVEL SECURITY;

--
-- Name: dream_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dream_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: processed_webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: user_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

SET search_path TO "$user", public;

INSERT INTO "schema_migrations" (version) VALUES
('20260905000000'),
('20260828000000'),
('20260711000000'),
('20260708000000'),
('20260707000000'),
('20260704000000'),
('20260703000000'),
('20260603000000'),
('20260602000000'),
('20260601000000'),
('20260528044316'),
('20260512000000'),
('20260424000000'),
('20260419000000'),
('20260418140000'),
('20260418125845'),
('20260415000001'),
('20260413000001'),
('20260411000001'),
('20260331000002'),
('20260331000001'),
('20260328000000'),
('20260327100000'),
('20260312000000'),
('20260311202128'),
('20260305000000'),
('20260303200817'),
('20260302195527'),
('20251207201519'),
('20250906192747'),
('20250831195549'),
('20250629192259'),
('20250629192227'),
('20250414195016'),
('20250227195516'),
('20240625200357'),
('20240519205627'),
('20240512194624'),
('20240303191156'),
('20240303191155');
