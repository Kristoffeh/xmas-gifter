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
    const { people } = body;

    if (!Array.isArray(people) || people.length === 0) {
      return NextResponse.json(
        { error: "People array is required" },
        { status: 400 }
      );
    }

    // Delete existing people for this user (in case they're redoing onboarding)
    await prisma.person.deleteMany({
      where: { userId: session.user.id },
    });

    // Create new people
    const createdPeople = await Promise.all(
      people.map((name: string) =>
        prisma.person.create({
          data: {
            name: name.trim(),
            userId: session.user.id,
          },
        })
      )
    );

    return NextResponse.json({ people: createdPeople }, { status: 201 });
  } catch (error) {
    console.error("Error creating people:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const people = await prisma.person.findMany({
      where: { userId: session.user.id },
      include: { gifts: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ people }, { status: 200 });
  } catch (error) {
    console.error("Error fetching people:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

