import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { EventService } from "../services/EventService";

export async function createEvent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const name = request.query.get('name') || await request.text() || 'world';
    const events = EventService.list();
    return { body: `Hello, ${name}!` };
};

app.http('createEvent', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: createEvent
});
