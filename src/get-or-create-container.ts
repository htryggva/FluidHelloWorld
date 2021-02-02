/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    IRuntimeFactory
} from "@fluidframework/container-definitions";
import { Container, Loader } from "@fluidframework/container-loader";
import { IRequest } from "@fluidframework/core-interfaces";
import {
    IDocumentServiceFactory,
    IUrlResolver
} from "@fluidframework/driver-definitions";
import { RouterliciousDocumentServiceFactory } from "@fluidframework/routerlicious-driver";
import { InsecureTinyliciousTokenProvider, InsecureTinyliciousUrlResolver } from "@fluidframework/tinylicious-driver";

/**
 * Connect to the Tinylicious service and retrieve a Container with the given ID running the given code.
 * @param documentId - The document id to retrieve or create
 * @param containerRuntimeFactory - The container factory to be loaded in the container
 */
export async function getOrCreateTinyliciousContainer(
    documentId: string,
    containerRuntimeFactory: IRuntimeFactory
): Promise<Container> {
    const tokenProvider = new InsecureTinyliciousTokenProvider();
    const documentServiceFactory = new RouterliciousDocumentServiceFactory(tokenProvider);

    const urlResolver = new InsecureTinyliciousUrlResolver();

    return getOrCreateContainer(
        documentId,
        { url: documentId },
        urlResolver,
        documentServiceFactory,
        containerRuntimeFactory,
    );
}

export async function getOrCreateContainer(
    documentId: string,
    request: IRequest,
    urlResolver: IUrlResolver,
    documentServiceFactory: IDocumentServiceFactory,
    containerRuntimeFactory: IRuntimeFactory,
): Promise<Container> {
    const module = { fluidExport: containerRuntimeFactory };
    const codeLoader = { load: async () => module };

    const loader = new Loader ({
        urlResolver,
        documentServiceFactory,
        codeLoader,
    });

    const container: Container = await loader.resolve(request);

    if (!container.existing) {
        container.close();

        const newLoader = new Loader({
            urlResolver,
            documentServiceFactory,
            codeLoader,
        });

        const newContainer = await newLoader.createDetachedContainer({
            package: 'no-dynamic-package',
            config: {},
        });

        const createNewRequest: IRequest = {
            url: documentId
        };

        await newContainer.attach(createNewRequest);

        return newContainer;
    }

    return container;
}
