import React from "react";
import ReactDOM from "react-dom";
import ApolloClient from "apollo-client";
import { ApolloProvider } from "react-apollo";
import { AUTH_TOKEN } from './constant'
import { WebSocketLink } from 'apollo-link-ws'
import { ApolloLink, split } from 'apollo-link'
import { getMainDefinition } from 'apollo-utilities'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory';
import { withClientState } from "apollo-link-state";
import registerServiceWorker from "./registerServiceWorker";
import { resolvers, defaults } from './graphql/resolver';
import { typeDefs } from './graphql/typeDefs';
import App from "./App";
import "./index.css";
import "./styles/normalize.css";
import "./styles/skeleton.css";
import "./styles/main.css";

const httpLink = new HttpLink({ uri: 'https://graphql-boilerplate-server-wqrtiyktjn.now.sh/graphql' })

const middlewareLink = new ApolloLink((operation, forward) => {
  // get the authentication token from local storage if it exists
  const tokenValue = localStorage.getItem(AUTH_TOKEN)
  // return the headers to the context so httpLink can read them
  operation.setContext({
    headers: {
      Authorization: tokenValue ? `${tokenValue}` : '',
    },
  })
  return forward(operation)
})

// authenticated httplink
const httpLinkAuth = middlewareLink.concat(httpLink)

const wsLink = new WebSocketLink({
  uri: `ws://localhost:3000/graphql`,
  options: {
    reconnect: true,
    connectionParams: {
      Authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN)}`,
    },
  },
})

const link = split(
  // split based on operation type
  ({ query }) => {
    const { kind, operation } = getMainDefinition(query)
    return kind === 'OperationDefinition' && operation === 'subscription'
  },
  wsLink,
  httpLinkAuth,
)

// Initialize apollo cache using inmemorycache
const cache = new InMemoryCache();

/**
 * @description Setting up apollo local state. It takse the default state, local resolvers
 * and typeDefs
 */
const stateLink = withClientState({
  cache,
  defaults,
  resolvers,
  typeDefs
});

// apollo client setup
const client = new ApolloClient({
  link: ApolloLink.from([stateLink, link]),
  cache,
  connectToDevTools: true,
  onError: (e) => { console.log(e.graphQLErrors) }
})

const token = localStorage.getItem(AUTH_TOKEN)
  // Render react app
ReactDOM.render(
    <ApolloProvider client={client}>  
        <App token={token} />
    </ApolloProvider>, document.getElementById('root'));

/**
 * Register react app PWA
 */
registerServiceWorker();
