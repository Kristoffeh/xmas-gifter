import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { personIds } = body;

    if (!Array.isArray(personIds)) {
      return NextResponse.json(
        { error: "Person IDs array is required" },
        { status: 400 }
      );
    }

    // Verify all personIds belong to the user
    const people = await prisma.person.findMany({
      where: {
        id: { in: personIds },
        userId: session.user.id,
      },
    });

    if (people.length !== personIds.length) {
      return NextResponse.json(
        { error: "Invalid person IDs" },
        { status: 400 }
      );
    }

    // Update the order for each person
    await Promise.all(
      personIds.map((personId: string, index: number) =>
        prisma.person.update({
          where: { id: personId },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ message: "Order updated" }, { status: 200 });
  } catch (error) {
    console.error("Error reordering people:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


